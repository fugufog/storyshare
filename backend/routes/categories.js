const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取所有分类（公开）
router.get('/', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT id, name, label, sort_order, created_at FROM categories ORDER BY sort_order ASC, id ASC'
    );
    res.json({ categories });
  } catch (error) {
    console.error('获取分类列表错误:', error);
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

// 创建分类（管理员）
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, label } = req.body;

    if (!name || !label) {
      return res.status(400).json({ error: '分类标识和显示名称不能为空' });
    }

    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return res.status(400).json({ error: '分类标识只能包含小写字母、数字和下划线，且必须以字母开头' });
    }

    if (name.length > 50 || label.length > 50) {
      return res.status(400).json({ error: '分类标识和显示名称长度不能超过50个字符' });
    }

    // 确定排序值
    const [maxOrder] = await pool.query('SELECT MAX(sort_order) as max_order FROM categories');
    const sortOrder = (maxOrder[0].max_order || 0) + 1;

    const [result] = await pool.query(
      'INSERT INTO categories (name, label, sort_order) VALUES (?, ?, ?)',
      [name, label, sortOrder]
    );

    res.status(201).json({
      message: '分类创建成功',
      category: { id: result.insertId, name, label, sort_order: sortOrder }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: '该分类标识已存在' });
    }
    console.error('创建分类错误:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
});

// 更新分类（管理员，仅允许修改 label 和 sort_order）
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { label, sort_order } = req.body;

    const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }

    if (label !== undefined && (!label || label.length > 50)) {
      return res.status(400).json({ error: '显示名称不能为空且不超过50个字符' });
    }

    const updates = [];
    const params = [];

    if (label !== undefined) {
      updates.push('label = ?');
      params.push(label);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(parseInt(sort_order));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }

    params.push(id);
    await pool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    res.json({ message: '分类更新成功', category: updated[0] });
  } catch (error) {
    console.error('更新分类错误:', error);
    res.status(500).json({ error: '更新分类失败' });
  }
});

// 删除分类（管理员，有帖子的分类不能删除）
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }

    const catName = existing[0].name;

    const [postCount] = await pool.query(
      'SELECT COUNT(*) as count FROM posts WHERE category = ?',
      [catName]
    );

    if (postCount[0].count > 0) {
      return res.status(400).json({
        error: '该分类下有 ' + postCount[0].count + ' 篇内容，请先迁移或删除这些内容后再删除分类'
      });
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类错误:', error);
    res.status(500).json({ error: '删除分类失败' });
  }
});

module.exports = router;
