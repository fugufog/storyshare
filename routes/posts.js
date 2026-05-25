const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取文章列表（分页）
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || 'all';
    const offset = (page - 1) * limit;
    
    let countQuery = 'SELECT COUNT(*) as total FROM posts';
    let dataQuery = `
      SELECT p.id, p.content, p.category, p.user_id, p.username, p.created_at
      FROM posts p
    `;
    const queryParams = [];
    const countParams = [];
    
    if (category !== 'all') {
      dataQuery += ' WHERE p.category = ?';
      countQuery += ' WHERE category = ?';
      queryParams.push(category);
      countParams.push(category);
    }
    
    // 获取总数
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;
    
    // 获取数据
    dataQuery += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
    
    const [rows] = await pool.query(dataQuery, queryParams);
    
    res.json({
      posts: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取文章列表错误:', error);
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

// 发布文章
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, category } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '内容不能为空' });
    }
    
    if (content.length > 500) {
      return res.status(400).json({ error: '内容长度不能超过500个字符' });
    }
    
    const postCategory = category === 'quote' ? 'quote' : 'story';
    
    // 使用昵称作为显示名（如果没有昵称则用用户名）
    const displayName = req.user.nickname || req.user.username;
    
    const [result] = await pool.query(
      'INSERT INTO posts (user_id, username, content, category) VALUES (?, ?, ?, ?)',
      [req.user.id, displayName, content.trim(), postCategory]
    );
    
    res.status(201).json({
      message: '发布成功',
      post: {
        id: result.insertId,
        content: content.trim(),
        category: postCategory,
        username: displayName,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('发布文章错误:', error);
    res.status(500).json({ error: '发布失败' });
  }
});

// 编辑文章（仅作者可编辑）
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { content, category } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: '内容长度不能超过500个字符' });
    }

    const [posts] = await pool.query(
      'SELECT * FROM posts WHERE id = ?',
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const post = posts[0];

    // 仅作者可编辑
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权编辑此文章' });
    }

    const postCategory = category === 'quote' ? 'quote' : 'story';

    await pool.query(
      'UPDATE posts SET content = ?, category = ? WHERE id = ?',
      [content.trim(), postCategory, postId]
    );

    res.json({
      message: '编辑成功',
      post: {
        id: postId,
        content: content.trim(),
        category: postCategory,
        username: post.username,
        created_at: post.created_at
      }
    });
  } catch (error) {
    console.error('编辑文章错误:', error);
    res.status(500).json({ error: '编辑失败' });
  }
});

// 删除文章（仅作者或管理员可删除）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    const [posts] = await pool.query(
      'SELECT * FROM posts WHERE id = ?',
      [postId]
    );
    
    if (posts.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }
    
    const post = posts[0];
    
    // 检查权限：作者或管理员
    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权删除此文章' });
    }
    
    await pool.query('DELETE FROM posts WHERE id = ?', [postId]);
    
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除文章错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
