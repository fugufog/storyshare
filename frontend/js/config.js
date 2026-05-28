// ============================================
// StoryShare 前端配置
// ============================================
// 部署到 Cloudflare Pages 时，请修改 API_BASE_URL 为你的阿里云后端地址
// 本地开发时保持默认值即可（使用相对路径通过后端代理）

// 全局 API 基础路径（使用 window 挂载，避免与 main.js 中的 const 声明冲突）
window.API_BASE_URL = (function () {
  // 如果当前页面在 localhost 运行，使用相对路径（开发模式，通过 Cloudflare Functions 代理）
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return ''; // 相对路径，由 Cloudflare Functions 或后端同一端口提供服务
  }
  // 生产环境（Cloudflare Pages）：使用相对路径，Cloudflare Functions 反向代理到阿里云后端
  return ''; // 相对路径，Cloudflare Functions 自动拦截 /api/* 并代理
})();

window.API_BASE = window.API_BASE_URL + '/api';
