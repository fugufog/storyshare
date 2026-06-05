const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [themes] = await pool.query('SELECT id, name, created_at FROM themes ORDER BY created_at DESC');
    res.json({ themes });
  } catch (error) {
    console.error('获取主题列表错误:', error);
    res.status(500).json({ error: '获取主题列表失败' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '主题名称不能为空' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: '主题名称不能超过100个字符' });
    }
    const [result] = await pool.query('INSERT INTO themes (name) VALUES (?)', [name.trim()]);
    res.status(201).json({
      message: '主题创建成功',
      theme: { id: result.insertId, name: name.trim() }
    });
  } catch (error) {
    console.error('创建主题错误:', error);
    res.status(500).json({ error: '创建主题失败' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '主题名称不能为空' });
    }
    const [existing] = await pool.query('SELECT * FROM themes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '主题不存在' });
    }
    await pool.query('UPDATE themes SET name = ? WHERE id = ?', [name.trim(), id]);
    res.json({ message: '主题更新成功' });
  } catch (error) {
    console.error('更新主题错误:', error);
    res.status(500).json({ error: '更新主题失败' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await pool.query('SELECT * FROM themes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '主题不存在' });
    }
    await pool.query('DELETE FROM themes WHERE id = ?', [id]);
    res.json({ message: '主题删除成功' });
  } catch (error) {
    console.error('删除主题错误:', error);
    res.status(500).json({ error: '删除主题失败' });
  }
});

module.exports = router;
