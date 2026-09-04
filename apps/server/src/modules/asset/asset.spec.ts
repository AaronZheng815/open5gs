import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ServiceUnavailableException } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import type { NrfTransport } from './discovery.client';

function makeFixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'nms-asset-'));
  writeFileSync(join(dir, 'amf.yaml'), 'amf:\n  sbi:\n    server:\n      - address: 127.0.0.5\n        port: 7777\n');
  writeFileSync(join(dir, 'smf.yaml'), 'smf:\n  sbi:\n    server:\n      - address: 127.0.0.4\n        port: 7777\n');
  return dir;
}

describe('Asset service', () => {
  let service: AssetService;
  let dir: string;

  beforeEach(() => {
    dir = makeFixtureDir();
    service = new AssetService();
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('listInventory 纯本地解析，不依赖 NRF，返回 nfType/addr/role + total', () => {
    const res = service.listInventory(dir);
    expect(res.items).toHaveLength(2);
    expect(res.total).toBe(2);
    expect(res.items[0]).toMatchObject({ nfType: 'amf', status: 'unknown' });
  });

  it('listNfs NRF 可达：已注册网元 status=online，未注册带 expected 差值标记', async () => {
    const transport: NrfTransport = {
      getJson: jest.fn(async (url: string) => {
        const target = new URL(url).searchParams.get('target-nf-type');
        return { nfInstances: target === 'AMF' ? [{ nfType: 'AMF', nfInstanceId: 'amf-1', fqdn: 'open5gs-amf', ipv4Addresses: ['127.0.0.5'] }] : [] };
      }),
    };
    const res = await service.listNfs({ nrfUrl: 'http://127.0.0.10:7777', configDir: dir, transport });
    expect(res.items).toHaveLength(2);
    const amf = res.items.find((i) => i.nfType === 'amf')!;
    const smf = res.items.find((i) => i.nfType === 'smf')!;
    expect(amf.status).toBe('online');
    expect(amf.instanceId).toBe('amf-1');
    expect(amf.expected).toBeUndefined();
    expect(smf.status).toBe('offline');
    expect(smf.expected).toBe(true);
  });

  it('listNfs NRF 不可达：抛 ServiceUnavailableException（503 语义）且携带原因', async () => {
    const bad: NrfTransport = { getJson: jest.fn(async () => { throw new Error('connect ECONNREFUSED 127.0.0.10:7777'); }) };
    await expect(service.listNfs({ nrfUrl: 'http://127.0.0.10:7777', configDir: dir, transport: bad })).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.listNfs({ nrfUrl: 'http://127.0.0.10:7777', configDir: dir, transport: bad })).rejects.toThrow('NRF 不可达');
  });

  it('listNfs 并集：NRF 注册但本地清单缺失的网元被追加为 online；无 fqdn 时不设 sbi', async () => {
    const transport: NrfTransport = {
      getJson: jest.fn(async (url: string) => {
        const target = new URL(url).searchParams.get('target-nf-type')!.toLowerCase();
        if (target === 'amf') return { nfInstances: [{ nfType: 'AMF', nfInstanceId: 'amf-1' }] }; // 无 fqdn
        if (target === 'nrf') return { nfInstances: [{ nfType: 'NRF', nfInstanceId: 'nrf-1', fqdn: 'open5gs-nrf', ipv4Addresses: ['127.0.0.10'] }] };
        return { nfInstances: [] };
      }),
    };
    const res = await service.listNfs({ nrfUrl: 'http://127.0.0.10:7777', configDir: dir, transport });
    // amf 在线、smf 离线 expected、nrf 并集补入（不在本地 fixture 清单）
    expect(res.items).toHaveLength(3);
    const amf = res.items.find((i) => i.nfType === 'amf')!;
    expect(amf.status).toBe('online');
    expect(amf.sbi).toBeUndefined(); // 无 fqdn，回退 base.sbi(undefined)
    const nrf = res.items.find((i) => i.nfType === 'nrf')!;
    expect(nrf.status).toBe('online');
    expect(nrf.addr).toBe('127.0.0.10');
    expect(nrf.sbi).toBe('open5gs-nrf');
    expect(nrf.expected).toBeUndefined();
  });
});

describe('Asset controller', () => {
  it('转发 inventory / nfs 到 service', async () => {
    const fake = {
      listInventory: jest.fn(() => ({ items: [], total: 0 })),
      listNfs: jest.fn(async () => ({ items: [], total: 0 })),
    };
    const ctrl = new AssetController(fake as unknown as AssetService);
    expect(ctrl.inventory()).toEqual({ items: [], total: 0 });
    await expect(ctrl.nfs()).resolves.toEqual({ items: [], total: 0 });
    expect(fake.listInventory).toHaveBeenCalledTimes(1);
    expect(fake.listNfs).toHaveBeenCalledTimes(1);
  });
});
