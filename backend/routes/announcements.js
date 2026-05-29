const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取公告列表（最新5条）
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, theme, created_at FROM announcements ORDER BY created_at DESC LIMIT 5'
    );
    res.json({ announcements: rows });
  } catch (error) {
    console.error('获取公告错误:', error);
    res.status(500).json({ error: '获取公告失败' });
  }
});

// 管理员发布公告
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { theme } = req.body;
    if (!theme || theme.trim().length === 0) {
      return res.status(400).json({ error: '主题不能为空' });
    }
    if (theme.length > 100) {
      return res.status(400).json({ error: '主题长度不能超过100个字符' });
    }

    const [result] = await pool.query(
      'INSERT INTO announcements (theme) VALUES (?)',
      [theme.trim()]
    );

    res.status(201).json({
      message: '公告发布成功',
      announcement: {
        id: result.insertId,
        theme: theme.trim(),
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('创建公告错误:', error);
    res.status(500).json({ error: '发布公告失败' });
  }
});

// 管理员删除公告
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await pool.query('SELECT id FROM announcements WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({ error: '公告不存在' });
    }

    await pool.query('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ message: '公告已删除' });
  } catch (error) {
    console.error('删除公告错误:', error);
    res.status(500).json({ error: '删除公告失败' });
  }
});

module.exports = router;
