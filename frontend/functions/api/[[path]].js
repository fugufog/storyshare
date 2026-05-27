// functions/api/[[path]].js
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 构建目标URL
  const targetUrl = `http://39.107.247.51:3000${url.pathname.replace('/api', '')}${url.search}`;
  
  // 转发请求
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined
  });
  
  // 添加CORS头
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}
