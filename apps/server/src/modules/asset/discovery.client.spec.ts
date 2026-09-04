import * as http2 from 'node:http2';
import { discoverNfs, getNrfUrl, nodeHttp2Transport, NrfHttpStatusError, type NrfTransport } from './discovery.client';

async function startH2Server(onStream: (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders) => void): Promise<{ port: number; close: () => Promise<void> }> {
  const server = http2.createServer();
  server.on('stream', onStream);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  return {
    port,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

function fakeTransport(nfInstances: unknown[]): NrfTransport {
  return {
    getJson: jest.fn(async (url: string) => {
      // 模拟 NRF：请求须带 requester + target 参数
      const u = new URL(url);
      expect(u.searchParams.get('requester-nf-type')).toBe('NRF');
      expect(u.pathname).toBe('/nnrf-disc/v1/nf-instances');
      const target = u.searchParams.get('target-nf-type');
      return { nfInstances: nfInstances.filter((n) => String((n as { nfType?: string }).nfType).toUpperCase() === target) };
    }),
  };
}

describe('discovery.client', () => {
  const KNOWN = ['amf', 'smf', 'nrf'];

  it('按 nfTypes 逐类查询并合并已注册 NF（nfType 转小写、带 instanceId/addresses）', async () => {
    const nfs = [
      { nfType: 'AMF', nfInstanceId: 'amf-1', fqdn: 'open5gs-amf', ipv4Addresses: ['127.0.0.5'] },
      { nfType: 'SMF', nfInstanceId: 'smf-1', ipv4Addresses: ['127.0.0.4'] },
    ];
    const out = await discoverNfs({ nrfUrl: 'http://127.0.0.10:7777', nfTypes: KNOWN, transport: fakeTransport(nfs) });
    expect(out).toEqual([
      expect.objectContaining({ nfType: 'amf', instanceId: 'amf-1', fqdn: 'open5gs-amf', addresses: ['127.0.0.5'] }),
      expect.objectContaining({ nfType: 'smf', instanceId: 'smf-1', addresses: ['127.0.0.4'] }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('某类型无注册时返回空数组（不抛）', async () => {
    const out = await discoverNfs({ nrfUrl: 'http://127.0.0.10:7777', nfTypes: ['nrf'], transport: fakeTransport([]) });
    expect(out).toEqual([]);
  });

  it('传输失败时向上抛错（供 service 包成 503）', async () => {
    const bad: NrfTransport = { getJson: jest.fn(async () => { throw new Error('connect ECONNREFUSED 127.0.0.10:7777'); }) };
    await expect(discoverNfs({ nrfUrl: 'http://127.0.0.10:7777', nfTypes: ['amf'], transport: bad })).rejects.toThrow('ECONNREFUSED');
  });

  it('getNrfUrl 缺省为 127.0.0.10:7777', () => {
    expect(getNrfUrl()).toBe('http://127.0.0.10:7777');
  });
});

describe('discoverNfs 错误分类（AC-7）', () => {
  it('4xx（target-nf-type 不可识别）容忍为无实例，不视为 NRF 不可达', async () => {
    const t: NrfTransport = { getJson: jest.fn(async () => { throw new NrfHttpStatusError(400, 'No target-nf-type'); }) };
    await expect(discoverNfs({ nrfUrl: 'http://127.0.0.10:7777', nfTypes: ['sgwc'], transport: t })).resolves.toEqual([]);
  });

  it('5xx / 连接失败仍向上传播（上游按 NRF 不可达 → 503）', async () => {
    const t5: NrfTransport = { getJson: jest.fn(async () => { throw new NrfHttpStatusError(503, 'overloaded'); }) };
    await expect(discoverNfs({ nrfUrl: 'http://127.0.0.10:7777', nfTypes: ['amf'], transport: t5 })).rejects.toBeInstanceOf(NrfHttpStatusError);
  });
});

describe('nodeHttp2Transport（真实 h2c prior knowledge 往返）', () => {
  it('200 + JSON 解析成功', async () => {
    const srv = await startH2Server((stream) => {
      stream.respond({ ':status': 200, 'content-type': 'application/json' });
      stream.end(JSON.stringify({ nfInstances: [{ nfType: 'AMF' }] }));
    });
    try {
      const body = await nodeHttp2Transport().getJson(`http://127.0.0.1:${srv.port}/nnrf-disc/v1/nf-instances`);
      expect(body).toEqual({ nfInstances: [{ nfType: 'AMF' }] });
    } finally {
      await srv.close();
    }
  });

  it('非 2xx（503）抛错，携带状态与 body', async () => {
    const srv = await startH2Server((stream) => {
      stream.respond({ ':status': 503 });
      stream.end('nrf overloaded');
    });
    try {
      await expect(nodeHttp2Transport().getJson(`http://127.0.0.1:${srv.port}/x`)).rejects.toThrow('503');
    } finally {
      await srv.close();
    }
  });

  it('连接失败（ECONNREFUSED）抛出底层错误', async () => {
    await expect(nodeHttp2Transport().getJson('http://127.0.0.1:1/x')).rejects.toThrow();
  });
});
