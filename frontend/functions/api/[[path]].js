// Cloudflare Pages Functions 反向代理
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 构造后端请求地址（你的阿里云 3000 端口）
  const backendUrl = new URL(
    url.pathname + url.search,
    "http://39.107.247.51:3000"
  );

  // 转发请求到后端
  const backendResponse = await fetch(backendUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "follow",
  });

  // 处理跨域问题
  const headers = new Headers(backendResponse.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");

  // 返回后端响应给前端
  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: headers,
  });
}