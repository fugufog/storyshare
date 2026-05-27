// functions/api/[[path]].js
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 构建目标URL - 去掉 /api 前缀
  const targetPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = `http://39.107.247.51:3000${targetPath}${url.search}`;
  
  try {
    // 准备请求体
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }
    
    // 转发请求到后端
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: body
    });
    
    // 添加CORS头
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '代理请求失败' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
