import { createServer, type Http2Server, type Http2ServerRequest } from 'node:http2';

let server: Http2Server | null = null;

/**
 * 最小 mock NRF（h2c prior knowledge，与 discovery.client 的 http2.connect 匹配）：
 * 对任意 /nnrf-disc/v1/nf-instances 查询回 200 + 空 nfInstances，
 * 使 /api/nfs 稳定叠加出「本地清单 + 全 offline（expected:true）」，AC-1/AC-8 资产表可渲染。
 */
export function startMockNrf(port: number): Promise<string> {
  return new Promise((resolve) => {
    server = createServer();
    server.on('stream', (stream, headers) => {
      // 只回显 nf-instances 查询；其余路径也回空数组即可
      stream.respond({ ':status': 200, 'content-type': 'application/json' });
      stream.end(JSON.stringify({ nfInstances: [] }));
    });
    server.on('request', (_req: Http2ServerRequest) => {
      /* ignore — h2c prior knowledge 走 stream */
    });
    server.listen(port, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

export async function stopMockNrf(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = null;
}
