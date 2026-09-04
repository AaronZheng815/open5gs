import { get } from 'node:http';

/** Info API / metrics 均走 HTTP/1.1（非 SBI 的 h2c）。 */
export interface InfoPager {
  page: number;
  page_size: number;
  count: number;
}

export interface InfoPage {
  items?: unknown[];
  pager?: InfoPager;
}

/** 发起 HTTP GET（`host:port/path`），成功返回 body 文本，非 200 或超时 reject。 */
export function httpGetText(host: string, port: number, path: string, timeoutMs = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = get({ host, port, path, timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve(body);
        else reject(new Error(`HTTP ${res.statusCode} for ${host}:${port}${path}`));
      });
    });
    req.on('timeout', () => req.destroy(new Error(`timeout ${host}:${port}${path}`)));
    req.on('error', reject);
  });
}

function withPage(path: string, page: number): string {
  return `${path}${path.includes('?') ? '&' : '?'}page=${page}`;
}

/**
 * Info API 分页读取（EV-003）：把 `{ items, pager:{page,page_size,count} }` 逐页聚合，
 * 也兼容 `[ ... ]` 数组形态（单页）。pager 语义：page 递增直到收集齐 count。
 */
export async function fetchInfoPages(
  host: string,
  port: number,
  path: string,
  getText: (h: string, p: number, path: string) => Promise<string> = httpGetText,
  maxPages = 10,
): Promise<unknown[]> {
  const out: unknown[] = [];
  let page = 0;
  for (let i = 0; i < maxPages; i++) {
    const target = page > 0 ? withPage(path, page) : path;
    const text = await getText(host, port, target);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return out;
    }
    const { items, pager } = normalize(parsed);
    out.push(...items);
    if (!pager || out.length >= pager.count) return out;
    page = (pager.page ?? page) + 1;
  }
  return out;
}

function normalize(parsed: unknown): { items: unknown[]; pager?: InfoPager } {
  if (Array.isArray(parsed)) return { items: parsed };
  if (parsed && typeof parsed === 'object') {
    const o = parsed as InfoPage;
    if (Array.isArray(o.items)) return { items: o.items, pager: o.pager };
  }
  return { items: [] };
}
