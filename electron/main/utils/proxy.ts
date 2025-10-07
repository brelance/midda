// src/lib/apiClient.ts
import { fetch, ProxyAgent, RequestInit } from "undici";
import dotenv from "dotenv";

dotenv.config();

// 根据环境创建代理实例，但先不设置
const proxyUrl = process.env.HTTPS_PROXY;
const agent =
  process.env.NODE_ENV === "development" && proxyUrl
    ? new ProxyAgent(proxyUrl)
    : undefined;

if (agent) {
  console.log(`[API Client] Using proxy agent for requests: ${proxyUrl}`);
}

// 导出一个我们自己的 fetch 函数
// 它封装了代理逻辑，但不依赖全局状态
export async function proxyFetch(url: string, options: RequestInit = {}) {
  const finalOptions = {
    ...options,
    // 在这里传入 dispatcher，它只对本次请求生效
    dispatcher: agent,
  };

  // 调用原始的 undiciFetch
  return fetch(url, finalOptions);
}

export default proxyFetch;
