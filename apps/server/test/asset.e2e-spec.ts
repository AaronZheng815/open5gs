import { bootApp, get, nfYaml, type Booted } from './utils';

const REAL_NRF_URL = 'http://127.0.0.10:7777';
const DEAD_NRF_URL = 'http://127.0.0.1:9';

describe('asset e2e (AC-1/AC-7/AC-8)', () => {
  let ctx: Booted;
  let prevNrfUrl: string | undefined;

  beforeAll(async () => {
    ctx = await bootApp({
      dbTag: 'asset',
      configFiles: {
        'nrf.yaml': nfYaml('nrf', '127.0.0.10'),
        'amf.yaml': nfYaml('amf', '127.0.0.5'),
        'smf.yaml': nfYaml('smf', '127.0.0.4'),
      },
    });
    prevNrfUrl = process.env.NRF_DISCOVERY_URL;
  });

  afterAll(async () => {
    if (prevNrfUrl === undefined) delete process.env.NRF_DISCOVERY_URL;
    else process.env.NRF_DISCOVERY_URL = prevNrfUrl;
    await ctx.cleanup();
  });

  it('AC-8：纯本地清单 inventory（不依赖 NRF）→ 200，含 3 个网元', async () => {
    const res = await get(ctx.instance, '/api/inventory', ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { items: { id: string; nfType: string }[]; total: number };
    expect(body.total).toBe(3);
    expect(body.items.map((i) => i.id).sort()).toEqual(['amf', 'nrf', 'smf']);
  });

  it('AC-7：NRF 不可达 → /api/nfs 返回 503 且 body 含「NRF 不可达」', async () => {
    process.env.NRF_DISCOVERY_URL = DEAD_NRF_URL;
    try {
      const res = await get(ctx.instance, '/api/nfs', ctx.authHeaders);
      expect(res.statusCode).toBe(503);
      expect(res.payload).toContain('NRF 不可达');
    } finally {
      process.env.NRF_DISCOVERY_URL = REAL_NRF_URL;
    }
  }, 20000);

  it('AC-1：NRF 可达 → /api/nfs 返回 200 且 items 为数组（在线叠加）', async () => {
    process.env.NRF_DISCOVERY_URL = REAL_NRF_URL;
    try {
      const res = await get(ctx.instance, '/api/nfs', ctx.authHeaders);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload) as { items: { id: string }[]; total: number };
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.total).toBe(body.items.length);
    } finally {
      process.env.NRF_DISCOVERY_URL = REAL_NRF_URL;
    }
  }, 30000);
});
