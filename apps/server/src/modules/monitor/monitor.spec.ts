import { NotFoundException } from '@nestjs/common';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MonitorService } from './monitor.service';
import { MonitorController } from './monitor.controller';
import { fetchInfoPages, httpGetText } from './info-api.client';

const METRICS_TEXT = '# HELP gnb gNodeBs\n# TYPE gnb gauge\ngnb 0\nfivegs_amffunction_rm_reginitreq 6\n';

/** scoped 配置目录，仅放 amf.yaml（addr=127.0.0.5）与 nrf.yaml（addr=127.0.0.10）。 */
function makeConfigDir(): { root: string; dir: string } {
  const root = mkdtempSync(join(tmpdir(), 'nms-mon-'));
  const dir = join(root, 'ogs');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'amf.yaml'), 'amf:\n  sbi:\n    server:\n      - address: 127.0.0.5\n        port: 7777\n');
  writeFileSync(join(dir, 'nrf.yaml'), 'nrf:\n  sbi:\n    server:\n      - address: 127.0.0.10\n        port: 7777\n');
  return { root, dir };
}

/** 按 path 分发的 fake getText：/metrics 返回指标文本，info 返回分页 items。 */
function fakeGetText(opts: { metrics?: string; infoPages?: Record<string, string[]> }): jest.Mock {
  return jest.fn(async (_host: string, _port: number, path: string) => {
    if (path === '/metrics') {
      if (!opts.metrics) throw new Error('ECONNREFUSED');
      return opts.metrics;
    }
    return JSON.stringify(opts.infoPages?.[path]?.[0] ?? { items: [], pager: { page: 0, page_size: 100, count: 0 } });
  });
}

describe('T-10 monitor (service)', () => {
  let cfg: { root: string; dir: string };
  afterEach(() => rmSync(cfg.root, { recursive: true, force: true }));

  it('snapshot 开启 :9090 的网元：available=true、metrics 非空可解析（AC-11 判定①）', async () => {
    cfg = makeConfigDir();
    const svc = new MonitorService(fakeGetText({ metrics: METRICS_TEXT }) as unknown as typeof httpGetText);
    const snap = await svc.snapshot('amf', cfg.dir);
    expect(snap.nfId).toBe('amf');
    expect(snap.available).toBe(true);
    expect(snap.metrics.length).toBeGreaterThan(0);
    expect(snap.metrics).toContainEqual({ name: 'gnb', value: 0 });
  });

  it('snapshot 未开启 :9090：返回 200 语义（不抛）+ available=false 降级标注（AC-11 判定②）', async () => {
    cfg = makeConfigDir();
    const svc = new MonitorService(fakeGetText({}) as unknown as typeof httpGetText); // metrics 抛错
    const snap = await svc.snapshot('nrf', cfg.dir);
    expect(snap.nfId).toBe('nrf');
    expect(snap.available).toBe(false);
    expect(snap.metrics).toEqual([]);
  });

  it('snapshot 未知网元抛 NotFound', async () => {
    cfg = makeConfigDir();
    const svc = new MonitorService(fakeGetText({ metrics: METRICS_TEXT }) as unknown as typeof httpGetText);
    await expect(svc.snapshot('nope', cfg.dir)).rejects.toThrow(NotFoundException);
  });
});

describe('T-10 monitor (info-api pager)', () => {
  it('fetchInfoPages 聚合 {items,pager} 分页，跨页收集全部（pager 语义 + withPage）', async () => {
    const getText = jest.fn(async (_h: string, _p: number, path: string) => {
      if (path === '/gnb-info') return JSON.stringify({ items: [{ gnbId: 'a' }], pager: { page: 0, page_size: 100, count: 2 } });
      if (path === '/gnb-info?page=1') return JSON.stringify({ items: [{ gnbId: 'b' }], pager: { page: 1, page_size: 100, count: 2 } });
      return '{}';
    });
    const items = await fetchInfoPages('127.0.0.5', 9090, '/gnb-info', getText as unknown as typeof httpGetText);
    expect(items).toHaveLength(2);
    expect(getText).toHaveBeenCalledWith('127.0.0.5', 9090, '/gnb-info');
    expect(getText).toHaveBeenCalledWith('127.0.0.5', 9090, '/gnb-info?page=1');
  });

  it('fetchInfoPages 数组形态（无 pager）单页返回', async () => {
    const getText = jest.fn(async () => JSON.stringify([{ imsi: '1' }, { imsi: '2' }]));
    const items = await fetchInfoPages('127.0.0.5', 9090, '/ue-info', getText as unknown as typeof httpGetText);
    expect(items).toHaveLength(2);
  });

  it('fetchInfoPages 非 JSON 响应返回空数组（catch 分支）', async () => {
    const getText = jest.fn(async () => 'not json');
    await expect(fetchInfoPages('127.0.0.1', 9090, '/x', getText as unknown as typeof httpGetText)).resolves.toEqual([]);
  });
});

describe('T-10 monitor (info-api httpGetText 真实 HTTP)', () => {
  it('200 返回 body；5xx reject；连接被拒 reject（覆盖 http/net 事件分支）', async () => {
    const server = createServer((req, res) => {
      if (req.url === '/ok') { res.writeHead(200); res.end('pong'); }
      else { res.writeHead(500); res.end('boom'); }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    try {
      await expect(httpGetText('127.0.0.1', port, '/ok')).resolves.toBe('pong');
      await expect(httpGetText('127.0.0.1', port, '/bad')).rejects.toThrow('HTTP 500');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await expect(httpGetText('127.0.0.1', 1, '/metrics')).rejects.toThrow();
  });
});

describe('T-10 monitor (controller)', () => {
  it('GET /metrics/:nf/snapshot 转发 service', async () => {
    const snapshot = jest.fn().mockResolvedValue({ nfId: 'amf', available: true, metrics: [], info: {} });
    const fake = { snapshot } as unknown as MonitorService;
    const ctrl = new MonitorController(fake);
    await expect(ctrl.snapshot('amf')).resolves.toEqual({ nfId: 'amf', available: true, metrics: [], info: {} });
    expect(snapshot).toHaveBeenCalledWith('amf');
  });
});
