/**
 * 去代理工具（决策 2.6）：NMS 后端大量请求 127.x / localhost 的 SBI 与 :9090，
 * 且会 spawn systemctl。系统代理环境变量（mihomo clash）会破坏这些联通（已知故障），
 * 因此必须在 outbound fetch 与子进程 env 层面显式排除。
 */
import { Agent, fetch } from 'undici';

const PROXY_ENV_KEYS = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
] as const;

/** 返回剔除代理变量的环境副本，用于 spawn 子进程（如 systemctl）。 */
export function sanitizeChildEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const stripped: NodeJS.ProcessEnv = { ...env };
  for (const key of PROXY_ENV_KEYS) {
    delete stripped[key];
  }
  return stripped;
}

let noProxyAgent: Agent | undefined;

/** 获得一个从不走 HTTP(S) 代理的 undici Agent（直连），供 loopback / SBI / 指标抓取使用。 */
export function getNoProxyDispatcher(): Agent {
  if (!noProxyAgent) {
    noProxyAgent = new Agent({ connect: { timeout: 5000 } });
  }
  return noProxyAgent;
}

/** 显式不带代理的 fetch：保证到 127.x/localhost 的请求不被代理污染。 */
export function noProxyFetch(
  url: string,
  init?: import('undici').RequestInit,
): Promise<import('undici').Response> {
  return fetch(url, { ...init, dispatcher: getNoProxyDispatcher() });
}

export { fetch as rawFetch };
