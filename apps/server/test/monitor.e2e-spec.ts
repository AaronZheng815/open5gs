import { bootApp, get, nfYaml, type Booted } from './utils';
import { MonitorService } from '../src/modules/monitor/monitor.service';

describe('monitor e2e (AC-11)', () => {
  let ctx: Booted;

  beforeAll(async () => {
    ctx = await bootApp({
      dbTag: 'monitor',
      configFiles: { 'amf.yaml': nfYaml('amf', '127.0.0.5') },
      override: (b) => b.overrideProvider(MonitorService).useFactory({ factory: () => new MonitorService(mockGetText) }),
    });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('AC-11：:9090/metrics 可抓 → available=true 且含指标', async () => {
    const res = await get(ctx.instance, '/api/metrics/amf/snapshot', ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { nfId: string; available: boolean; metrics: { name: string; value: number }[] };
    expect(body.nfId).toBe('amf');
    expect(body.available).toBe(true);
    const conn = body.metrics.find((m) => m.name === 'open5gs_amf_connections');
    expect(conn?.value).toBe(3);
  });

  it('AC-11：:9090 未开启 → 降级 available=false 且 [](不 500)', async () => {
    scrapeMode = 'down';
    const res = await get(ctx.instance, '/api/metrics/amf/snapshot', ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { available: boolean; metrics: unknown[] };
    expect(body.available).toBe(false);
    expect(body.metrics).toEqual([]);
    scrapeMode = 'ok';
  });

  it('未知网元 → 404', async () => {
    const res = await get(ctx.instance, '/api/metrics/sepp/snapshot', ctx.authHeaders);
    expect(res.statusCode).toBe(404);
  });
});

let scrapeMode: 'ok' | 'down' = 'ok';
const mockGetText = async (host: string, port: number, path: string): Promise<string> => {
  if (path === '/metrics') {
    if (scrapeMode === 'down') throw new Error('connection refused');
    return 'open5gs_amf_connections 3\nopen5gs_amf_registered_ues 2\n';
  }
  // Info API 端点（amf 的 gnb-info/ue-info）在 mock 下抛错 → 降级跳过
  throw new Error('info endpoint unavailable');
};
