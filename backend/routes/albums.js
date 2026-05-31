const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取专辑列表（公开专辑 + 自己的私有专辑）
router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    let userId = null;
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (e) { /* token无效则作为匿名用户 */ }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const authorId = req.query.user_id || '';

    let countQuery = 'SELECT COUNT(*) as total FROM albums WHERE (is_public = 1';
    let dataQuery = 'SELECT a.*, (SELECT COUNT(*) FROM album_entries WHERE album_id = a.id) as entry_count FROM albums a WHERE (a.is_public = 1';
    const params = [];
    const countParams = [];

    if (userId) {
      countQuery += ' OR a.user_id = ?';
      dataQuery += ' OR a.user_id = ?';
      params.push(userId);
      countParams.push(userId);
    }
    countQuery += ')';
    dataQuery += ')';

    if (authorId) {
      countQuery += ' AND a.user_id = ?';
      dataQuery += ' AND a.user_id = ?';
      params.push(authorId);
      countParams.push(authorId);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    dataQuery += ' ORDER BY a.updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(dataQuery, params);

    res.json({
      albums: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('获取专辑列表错误:', error);
    res.status(500).json({ error: '获取专辑列表失败' });
  }
});

// 获取单个专辑详情（含内容列表）
router.get('/:id', async (req, res) => {
  try {
    const albumId = parseInt(req.params.id);

    const [albums] = await pool.query('SELECT * FROM albums WHERE id = ?', [albumId]);
    if (albums.length === 0) {
      return res.status(404).json({ error: '专辑不存在' });
    }

    const album = albums[0];

    // 检查权限：公开或自己的
    const authHeader = req.headers['authorization'];
    let userId = null;
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (e) {}
    }

    if (!album.is_public && (!userId || album.user_id !== userId)) {
      return res.status(403).json({ error: '无权查看此专辑' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM album_entries WHERE album_id = ?', [albumId]
    );
    const total = countResult[0].total;

    const [entries] = await pool.query(
      'SELECT * FROM album_entries WHERE album_id = ? ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?',
      [albumId, limit, offset]
    );

    res.json({
      album,
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('获取专辑详情错误:', error);
    res.status(500).json({ error: '获取专辑详情失败' });
  }
});

// 创建专辑
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, is_public } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '专辑名称不能为空' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: '专辑名称不能超过100个字符' });
    }

    const displayName = req.user.nickname || req.user.username;
    const pub = is_public === false ? 0 : 1;

    const [result] = await pool.query(
      'INSERT INTO albums (user_id, username, name, description, is_public) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, displayName, name.trim(), (description || '').trim() || null, pub]
    );

    res.status(201).json({
      message: '专辑创建成功',
      album: {
        id: result.insertId,
        user_id: req.user.id,
        username: displayName,
        name: name.trim(),
        description: (description || '').trim() || null,
        is_public: pub,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('创建专辑错误:', error);
    res.status(500).json({ error: '创建专辑失败' });
  }
});

// 编辑专辑
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id);
    const { name, description, is_public } = req.body;

    const [albums] = await pool.query('SELECT * FROM albums WHERE id = ?', [albumId]);
    if (albums.length === 0) {
      return res.status(404).json({ error: '专辑不存在' });
    }

    if (albums[0].user_id !== req.user.id) {
      return res.status(403).json({ error: '无权编辑此专辑' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '专辑名称不能为空' });
    }

    const pub = is_public === false ? 0 : 1;

    await pool.query(
      'UPDATE albums SET name = ?, description = ?, is_public = ? WHERE id = ?',
      [name.trim(), (description || '').trim() || null, pub, albumId]
    );

    res.json({ message: '专辑更新成功' });
  } catch (error) {
    console.error('编辑专辑错误:', error);
    res.status(500).json({ error: '编辑专辑失败' });
  }
});

// 删除专辑
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id);

    const [albums] = await pool.query('SELECT * FROM albums WHERE id = ?', [albumId]);
    if (albums.length === 0) {
      return res.status(404).json({ error: '专辑不存在' });
    }

    if (albums[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权删除此专辑' });
    }

    await pool.query('DELETE FROM albums WHERE id = ?', [albumId]);
    res.json({ message: '专辑已删除' });
  } catch (error) {
    console.error('删除专辑错误:', error);
    res.status(500).json({ error: '删除专辑失败' });
  }
});

// 添加专辑内容
router.post('/:id/entries', authenticateToken, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id);
    const { content } = req.body;

    const [albums] = await pool.query('SELECT * FROM albums WHERE id = ?', [albumId]);
    if (albums.length === 0) {
      return res.status(404).json({ error: '专辑不存在' });
    }

    if (albums[0].user_id !== req.user.id) {
      return res.status(403).json({ error: '只有专辑作者可以添加内容' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: '内容长度不能超过2000个字符' });
    }

    const [maxOrder] = await pool.query(
      'SELECT MAX(sort_order) as max_order FROM album_entries WHERE album_id = ?',
      [albumId]
    );
    const sortOrder = (maxOrder[0].max_order || 0) + 1;

    const [result] = await pool.query(
      'INSERT INTO album_entries (album_id, content, sort_order) VALUES (?, ?, ?)',
      [albumId, content.trim(), sortOrder]
    );

    // 更新专辑时间戳
    await pool.query('UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [albumId]);

    res.status(201).json({
      message: '内容添加成功',
      entry: {
        id: result.insertId,
        album_id: albumId,
        content: content.trim(),
        sort_order: sortOrder,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('添加专辑内容错误:', error);
    res.status(500).json({ error: '添加内容失败' });
  }
});

// 编辑专辑内容
router.put('/entries/:id', authenticateToken, async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    const { content } = req.body;

    const [entries] = await pool.query(
      'SELECT e.*, a.user_id FROM album_entries e JOIN albums a ON e.album_id = a.id WHERE e.id = ?',
      [entryId]
    );
    if (entries.length === 0) {
      return res.status(404).json({ error: '内容不存在' });
    }

    if (entries[0].user_id !== req.user.id) {
      return res.status(403).json({ error: '无权编辑此内容' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    await pool.query('UPDATE album_entries SET content = ? WHERE id = ?', [content.trim(), entryId]);
    res.json({ message: '内容更新成功' });
  } catch (error) {
    console.error('编辑专辑内容错误:', error);
    res.status(500).json({ error: '编辑内容失败' });
  }
});

// 删除专辑内容
router.delete('/entries/:id', authenticateToken, async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);

    const [entries] = await pool.query(
      'SELECT e.*, a.user_id FROM album_entries e JOIN albums a ON e.album_id = a.id WHERE e.id = ?',
      [entryId]
    );
    if (entries.length === 0) {
      return res.status(404).json({ error: '内容不存在' });
    }

    if (entries[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权删除此内容' });
    }

    await pool.query('DELETE FROM album_entries WHERE id = ?', [entryId]);
    res.json({ message: '内容已删除' });
  } catch (error) {
    console.error('删除专辑内容错误:', error);
    res.status(500).json({ error: '删除内容失败' });
  }
});

module.exports = router;
