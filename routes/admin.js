const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const XLSX = require('xlsx');

const router = express.Router();

// 管理员下载所有内容为 Excel
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT p.id, p.username, p.content, p.category, p.created_at
      FROM posts p
      ORDER BY p.created_at DESC
    `);
    
    // 格式化数据
    const data = posts.map(post => ({
      'ID': post.id,
      '作者': post.username,
      '内容': post.content,
      '类型': post.category === 'story' ? '故事' : '短句',
      '发布时间': new Date(post.created_at).toLocaleString('zh-CN')
    }));
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 5 },   // ID
      { wch: 15 },  // 作者
      { wch: 60 },  // 内容
      { wch: 10 },  // 类型
      { wch: 20 }   // 发布时间
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '所有内容');
    
    // 生成 Excel 文件并发送
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="storyshare_export_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('导出 Excel 错误:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// 获取所有用户（管理员用）
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
    );
    // 统计每个用户的文章数
    const usersWithCount = await Promise.all(users.map(async (user) => {
      const [countResult] = await pool.query(
        'SELECT COUNT(*) as count FROM posts WHERE user_id = ?',
        [user.id]
      );
      return {
        ...user,
        post_count: countResult[0].count,
        created_at: new Date(user.created_at).toISOString()
      };
    }));
    res.json({ users: usersWithCount });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 删除用户（管理员用，不能删除自己）
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // 不能删除自己
    if (userId === req.user.id) {
      return res.status(400).json({ error: '不能删除自己的账号' });
    }
    
    // 检查用户是否存在
    const [users] = await pool.query('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const targetUser = users[0];
    
    // 不能删除其他管理员
    if (targetUser.role === 'admin') {
      return res.status(400).json({ error: '不能删除其他管理员账号' });
    }
    
    // 删除用户（关联文章会自动级联删除）
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({ 
      message: `用户 ${targetUser.username} 及其所有内容已删除`,
      deletedUser: targetUser.username
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

module.exports = router;
