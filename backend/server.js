require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const adminRoutes = require('./routes/admin');
const announcementRoutes = require('./routes/announcements');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
// CORS - 允许 Cloudflare Pages 前端访问（生产环境建议配置具体域名）
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 本地开发模式：同时提供前端静态文件
// 生产环境中可移除以下代码（由 Cloudflare Pages 托管前端）
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);

// 本地开发模式：前端路由 - 所有非 API 请求返回 index.html
// 生产环境中可移除此路由（由 Cloudflare Pages 托管前端）
app.get('/{*path}', (req, res) => {
  // 忽略 API 路由
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API 接口不存在' });
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// 启动服务器
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}

start();
