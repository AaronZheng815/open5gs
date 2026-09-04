import * as http2 from 'node:http2';
import { KNOWN_NF_TYPES } from './inventory.loader';

/** NRF 发现返回的单个 NF Profile（按需抽取字段）。 */
export interface DiscoveredNf {
  nfType: string;
  instanceId?: string;
  fqdn?: string;
  addresses: string[];
}

/** 可注入的传输，便于单测 mock；生产改用 http2 直连 NRF。 */
export interface NrfTransport {
  getJson(url: string): Promise<unknown>;
}

export const DEFAULT_NRF_TIMEOUT_MS = 5000;

/** NRF 返回了非 2xx 的 HTTP 状态（如 400 表示该 target-nf-type 不受支持）。 */
export class NrfHttpStatusError extends Error {
  constructor(public readonly status: number, body: string) {
    super(`NRF 返回 ${status}：${body}`);
    this.name = 'NrfHttpStatusError';
  }
}

/** NRF 发现服务地址（决策 2.3：在线叠加来源，EV-001）。缺省 127.0.0.10:7777。 */
export function getNrfUrl(): string {
  return process.env.NRF_DISCOVERY_URL ?? 'http://127.0.0.10:7777';
}

function toDiscoveredNf(raw: unknown): DiscoveredNf {
  const n = raw as Record<string, unknown> | undefined;
  return {
    nfType: String(n?.nfType ?? '').toLowerCase(),
    instanceId: n?.nfInstanceId as string | undefined,
    fqdn: n?.fqdn as string | undefined,
    addresses: Array.isArray(n?.ipv4Addresses) ? (n?.ipv4Addresses as string[]) : [],
  };
}

async function queryType(base: string, nfType: string, transport: NrfTransport): Promise<DiscoveredNf[]> {
  const url = new URL(`${base.replace(/\/$/, '')}/nnrf-disc/v1/nf-instances`);
  url.searchParams.set('requester-nf-type', 'NRF');
  url.searchParams.set('target-nf-type', nfType.toUpperCase());
  let body: unknown;
  try {
    body = await transport.getJson(url.href);
  } catch (err) {
    // 4xx（如该 target-nf-type 在 NRF 中不可识别，4G 网元不注册 5G NRF）视为该类型无实例；
    // 连接失败/超时/5xx 才是真正“NRF 不可达”，向上抛给 service → 503（AC-7）。
    if (err instanceof NrfHttpStatusError && err.status < 500) return [];
    throw err;
  }
  const list = (body as { nfInstances?: unknown[] } | null)?.nfInstances ?? [];
  return list.map(toDiscoveredNf).filter((n) => n.nfType === nfType);
}

/**
 * NRF 发现：按各目标类型查询并合并已注册 NF 实例（AC-1 在线叠加）。
 * Open5GS NRF 要求同时携带 requester-nf-type 与 target-nf-type，故逐类型查询。
 */
export async function discoverNfs(
  opts: { nrfUrl?: string; transport?: NrfTransport; nfTypes?: string[] } = {},
): Promise<DiscoveredNf[]> {
  const base = opts.nrfUrl ?? getNrfUrl();
  const transport = opts.transport ?? nodeHttp2Transport();
  const types = opts.nfTypes ?? KNOWN_NF_TYPES;
  const seen = new Map<string, DiscoveredNf>();
  const results = await Promise.all(types.map((t) => queryType(base, t, transport)));
  for (const group of results) for (const nf of group) if (!seen.has(nf.nfType)) seen.set(nf.nfType, nf);
  return [...seen.values()];
}

/** 基于 Node HTTP/2（h2c prior knowledge）的 NRF 传输：SBI 只讲 HTTP/2，HTTP/1.1 会收到空回复。 */
export function nodeHttp2Transport(timeoutMs: number = DEFAULT_NRF_TIMEOUT_MS): NrfTransport {
  return {
    getJson(urlStr: string): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        const origin = `${u.protocol}//${u.host}`;
        const client = http2.connect(origin);
        const timer = setTimeout(() => {
          client.destroy();
          reject(new Error(`NRF 请求超时（${timeoutMs}ms）`));
        }, timeoutMs);

        const fail = (err: Error): void => {
          clearTimeout(timer);
          client.destroy();
          reject(err);
        };

        // connect 层错误（如 ECONNREFUSED / 超时）会落在 client 而非 req 上
        client.on('error', fail);

        const req = client.request({
          ':method': 'GET',
          ':path': `${u.pathname}${u.search}`,
          accept: 'application/json',
          'user-agent': 'open5gs-nms',
        });

        let status = 0;
        let data = '';
        req.on('response', (headers) => {
          status = Number(headers[':status'] ?? 0);
        });
        req.on('data', (chunk) => {
          data += chunk;
        });
        req.on('end', () => {
          clearTimeout(timer);
          client.close();
          if (status === 0) {
            reject(new Error('NRF 无响应（连接被关闭）'));
          } else if (status >= 400) {
            reject(new NrfHttpStatusError(status, data));
          } else {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          }
        });
        req.on('error', fail);
        req.end();
      });
    },
  };
}
