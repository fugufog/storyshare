// ============================================
// StoryShare 前端配置
// ============================================
// 部署到 Cloudflare Pages 时，请修改 API_BASE_URL 为你的阿里云后端地址
// 本地开发时保持默认值即可（使用相对路径通过后端代理）

// 全局 API 基础路径（使用 window 挂载，避免与 main.js 中的 const 声明冲突）
window.API_BASE_URL = (function () {
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return ''; // 本地开发保持相对路径
  }
  // 生产环境直接请求 Cloudflare Tunnel
  return 'https://judge-minimum-assuming-trust.trycloudflare.com';
})();

window.API_BASE = window.API_BASE_URL + '/api';