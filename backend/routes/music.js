const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取音乐配置（所有人可读）
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT music_type, music_id FROM music_config WHERE id = 1'
    );
    if (rows.length === 0) {
      return res.json({ music_type: '0', music_id: '2233842197' });
    }
    res.json({ music_type: rows[0].music_type, music_id: rows[0].music_id });
  } catch (error) {
    console.error('获取音乐配置错误:', error);
    res.status(500).json({ error: '获取音乐配置失败' });
  }
});

// 更新音乐配置（仅管理员）
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { music_type, music_id } = req.body;
    if (!music_id || !music_id.trim()) {
      return res.status(400).json({ error: '音乐ID不能为空' });
    }
    if (!['0', '2'].includes(music_type)) {
      return res.status(400).json({ error: '无效的音乐类型' });
    }

    await pool.query(
      'INSERT INTO music_config (id, music_type, music_id) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE music_type = VALUES(music_type), music_id = VALUES(music_id)',
      [music_type, music_id.trim()]
    );

    res.json({ message: '音乐配置已更新', music_type, music_id: music_id.trim() });
  } catch (error) {
    console.error('更新音乐配置错误:', error);
    res.status(500).json({ error: '更新音乐配置失败' });
  }
});

module.exports = router;
