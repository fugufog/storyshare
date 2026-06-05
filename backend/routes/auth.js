const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

function getVersionInfo() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'version.json'), 'utf8'));
  } catch (e) { return null; }
}

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度需在2-20个字符之间' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6个字符' });
    }
    
    // 检查用户名是否已存在
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 加密密码并插入用户（昵称默认等于用户名）
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, nickname, password) VALUES (?, ?, ?)',
      [username, username, hashedPassword]
    );
    
    res.status(201).json({ message: '注册成功', userId: result.insertId });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    // 查找用户
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const user = users[0];
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 昵称：如果有则用昵称，否则用用户名
    const nickname = user.nickname || user.username;
    
    // 生成 JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, nickname: nickname, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const versionData = getVersionInfo();

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: nickname,
        role: user.role,
        nav_layout: user.nav_layout || 'sidebar',
        last_seen_version: user.last_seen_version || null
      },
      version: versionData ? {
        current: versionData.version,
        update_info: versionData.update_info,
        features: versionData.features,
        has_update: !user.last_seen_version || user.last_seen_version !== versionData.version
      } : null
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 修改密码（需登录）
router.put('/password', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少6个字符' });
    }
    
    // 先验证旧密码
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];
    
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: '旧密码错误' });
    }
    
    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    
    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '密码修改失败' });
  }
});

// 修改昵称（需登录）
router.put('/nickname', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { nickname } = req.body;
    
    if (!nickname) {
      return res.status(400).json({ error: '昵称不能为空' });
    }
    
    if (nickname.length < 1 || nickname.length > 20) {
      return res.status(400).json({ error: '昵称长度需在1-20个字符之间' });
    }
    
    // 更新昵称
    await pool.query('UPDATE users SET nickname = ? WHERE id = ?', [nickname, req.user.id]);
    
    // 同时更新 posts 表中的 username（显示名）
    await pool.query('UPDATE posts SET username = ? WHERE user_id = ?', [nickname, req.user.id]);
    
    // 生成新的 JWT
    const token = jwt.sign(
      { id: req.user.id, username: req.user.username, nickname: nickname, role: req.user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: '昵称修改成功',
      token,
      user: {
        id: req.user.id,
        username: req.user.username,
        nickname: nickname,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('修改昵称错误:', error);
    res.status(500).json({ error: '昵称修改失败' });
  }
});

// 验证当前登录状态
router.get('/me', authenticateToken, async (req, res) => {
  const [userRows] = await pool.query(
    'SELECT id, username, nickname, role, nav_layout, last_seen_version FROM users WHERE id = ?',
    [req.user.id]
  );
  if (userRows.length === 0) {
    return res.status(404).json({ error: '用户不存在' });
  }
  const u = userRows[0];
  res.json({
    user: {
      id: u.id, username: u.username, nickname: u.nickname, role: u.role,
      nav_layout: u.nav_layout || 'sidebar',
      last_seen_version: u.last_seen_version || null
    }
  });
});

// 标记版本已读
router.put('/seen-version', authenticateToken, async (req, res) => {
  try {
    const { version } = req.body;
    if (!version) return res.status(400).json({ error: '缺少版本号' });
    await pool.query('UPDATE users SET last_seen_version = ? WHERE id = ?', [version, req.user.id]);
    res.json({ message: '已标记为已读' });
  } catch (error) {
    console.error('标记版本错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// 获取偏好设置
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT nav_layout FROM users WHERE id = ?', [req.user.id]);
    res.json({ nav_layout: rows[0]?.nav_layout || 'sidebar' });
  } catch (error) {
    res.status(500).json({ error: '获取偏好失败' });
  }
});

// 更新偏好设置
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { nav_layout } = req.body;
    if (nav_layout && !['sidebar', 'topbar'].includes(nav_layout)) {
      return res.status(400).json({ error: '无效的布局偏好' });
    }
    if (nav_layout) {
      await pool.query('UPDATE users SET nav_layout = ? WHERE id = ?', [nav_layout, req.user.id]);
    }
    res.json({ message: '偏好已保存' });
  } catch (error) {
    console.error('保存偏好错误:', error);
    res.status(500).json({ error: '保存偏好失败' });
  }
});

module.exports = router;
