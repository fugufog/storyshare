const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取某篇文章的评论
router.get('/post/:postId', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE post_id = ?', [postId]
    );
    const total = countResult[0].total;

    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
      [postId, limit, offset]
    );

    res.json({
      comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('获取评论错误:', error);
    res.status(500).json({ error: '获取评论失败' });
  }
});

// 添加评论
router.post('/post/:postId', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const { content } = req.body;

    // 验证文章存在
    const [posts] = await pool.query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: '评论内容不能超过500个字符' });
    }

    const displayName = req.user.nickname || req.user.username;

    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, username, content) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, displayName, content.trim()]
    );

    res.status(201).json({
      message: '评论成功',
      comment: {
        id: result.insertId,
        post_id: postId,
        user_id: req.user.id,
        username: displayName,
        content: content.trim(),
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('添加评论错误:', error);
    res.status(500).json({ error: '评论失败' });
  }
});

// 删除评论（作者或管理员）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);

    const [comments] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }

    const comment = comments[0];
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权删除此评论' });
    }

    await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ message: '评论已删除' });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({ error: '删除评论失败' });
  }
});

module.exports = router;
