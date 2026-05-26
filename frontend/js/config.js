// ============================================
// StoryShare 前端配置
// ============================================
// 部署到 Cloudflare Pages 时，请修改 API_BASE_URL 为你的阿里云后端地址
// 本地开发时保持默认值即可（使用相对路径通过后端代理）

const API_BASE_URL = (function () {
  // 如果当前页面在 localhost 运行，使用相对路径（开发模式）
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return ''; // 相对路径，由后端同一端口提供服务
  }
  // 生产环境：阿里云后端 API 地址
  return 'http://39.107.247.51:3000';
})();

const API_BASE = API_BASE_URL + '/api';
