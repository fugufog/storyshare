require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
// CORS - 允许 Cloudflare Pages 前端访问
// 部署到生产环境时，请将 origin 修改为你的 Cloudflare Pages 域名
app.use(cors({
  origin: [
    'http://localhost:3000',    // 本地开发（后端自带前端）
    'http://localhost:8080',    // 本地开发（单独运行前端）
    'https://storyshare.fugufugu583.workers.dev' // Cloudflare Pages 生产环境
  ],
  credentials: true
}));
app.use(express.json());

// 本地开发模式：同时提供前端静态文件
// 生产环境中可移除以下代码（由 Cloudflare Pages 托管前端）
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);

// 本地开发模式：前端路由 - 所有非 API 请求返回 index.html
// 生产环境中可移除此路由（由 Cloudflare Pages 托管前端）
app.get('*', (req, res) => {
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
