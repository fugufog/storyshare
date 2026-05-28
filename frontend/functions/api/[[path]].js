// Cloudflare Pages Functions 反向代理
// 将 /api/* 请求转发到阿里云 ECS 后端

const BACKEND_URL = "http://39.107.247.51:3000";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 处理 OPTIONS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 构造后端请求 URL（保留完整路径和查询参数）
  const backendUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

  // 仅转发必要的 headers（避免转发 Cloudflare 内部 headers 导致问题）
  const forwardHeaders = new Headers();
  const allowedHeaders = [
    "content-type",
    "authorization",
    "accept",
    "accept-language",
    "user-agent",
  ];
  for (const [key, value] of request.headers) {
    if (allowedHeaders.includes(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  }

  // 构造请求选项
  const fetchOptions = {
    method: request.method,
    headers: forwardHeaders,
    redirect: "follow",
  };

  // GET/HEAD 请求不应包含 body
  if (request.method !== "GET" && request.method !== "HEAD") {
    fetchOptions.body = request.body;
  }

  try {
    // 转发请求到后端
    const backendResponse = await fetch(backendUrl, fetchOptions);

    // 构建响应 headers
    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    responseHeaders.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    // 返回后端响应
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("代理请求失败:", error.message);
    return new Response(
      JSON.stringify({ error: "后端服务暂时不可用，请稍后重试" }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
