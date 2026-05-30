require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const adminRoutes = require('./routes/admin');
const announcementRoutes = require('./routes/announcements');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
// CORS
var corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 通用 API 限流：每个 IP 每分钟最多 100 次请求
var generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' }
});
app.use('/api', generalLimiter);

// 认证接口限流：每个 IP 每分钟最多 10 次请求（防暴力破解）
var authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登录/注册请求过于频繁，请稍后再试' }
});
app.use('/api/auth', authLimiter);

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
