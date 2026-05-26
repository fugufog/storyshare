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
  // 生产环境：替换为你的阿里云后端 API 地址
  // 例如：'https://api.yourdomain.com' 或 'https://your-server-ip:3000'
  return 'https://your-backend-domain.com';
})();

const API_BASE = API_BASE_URL + '/api';
