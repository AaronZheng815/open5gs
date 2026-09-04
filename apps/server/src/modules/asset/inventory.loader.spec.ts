import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KNOWN_NF_TYPES, loadInventory, resolveConfigDir, ROLE_LABELS } from './inventory.loader';

function makeDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'nms-inv-'));
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body);
  }
  return dir;
}

describe('inventory.loader', () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = '';
  });

  it('KNOWN_NF_TYPES 覆盖基线 16 网元（11 个 5G SBA + 5 个 4G EPC）', () => {
    expect(KNOWN_NF_TYPES).toHaveLength(16);
    // 5G SBA
    expect(KNOWN_NF_TYPES).toEqual(
      expect.arrayContaining(['nrf', 'scp', 'amf', 'smf', 'upf', 'ausf', 'udm', 'udr', 'pcf', 'nssf', 'bsf', 'mme', 'hss', 'sgwc', 'sgwu', 'pcrf']),
    );
  });

  it('从 sbi.server.address 取网络地址（5G SBA），status=unknown', () => {
    dir = makeDir({
      'amf.yaml': 'amf:\n  sbi:\n    server:\n      - address: 127.0.0.5\n        port: 7777\n  ngap:\n    server:\n      - address: 172.18.10.2\n',
    });
    const items = loadInventory(dir);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'amf', nfType: 'amf', addr: '127.0.0.5', role: ROLE_LABELS.amf, status: 'unknown' });
  });

  it('无 sbi 时回退到第一个 loopback 地址（4G MME，跳过外部 172.x）', () => {
    dir = makeDir({
      'mme.yaml': [
        'mme:',
        '  s1ap:',
        '    server:',
        '      - address: 172.18.10.2',
        '  gtpc:',
        '    server:',
        '      - address: 127.0.0.2',
        '    client:',
        '      sgwc:',
        '        - address: 127.0.0.3',
      ].join('\n'),
    });
    const items = loadInventory(dir);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ nfType: 'mme', addr: '127.0.0.2', role: ROLE_LABELS.mme });
  });

  it('sepp（漫游未启用）与非 yaml 文件被过滤，只保留 KNOWN 网元', () => {
    dir = makeDir({
      'nrf.yaml': 'nrf:\n  sbi:\n    server:\n      - address: 127.0.0.10\n        port: 7777\n',
      'sepp1.yaml': 'sepp:\n  sbi:\n    server:\n      - address: 127.0.1.250\n',
      'meson.build': 'foo\n',
    });
    const items = loadInventory(dir);
    expect(items).toHaveLength(1);
    expect(items[0].nfType).toBe('nrf');
  });

  it('解析 .yaml.in 模板（仓库形态）同样得到网元资产', () => {
    dir = makeDir({
      'nrf.yaml.in': 'nrf:\n  sbi:\n    server:\n      - address: 127.0.0.10\n        port: 7777\n',
    });
    const items = loadInventory(dir);
    expect(items).toHaveLength(1);
    expect(items[0].addr).toBe('127.0.0.10');
  });

  it('目录无 yaml（或不存在）时返回空数组，不抛异常', () => {
    dir = makeDir({ 'readme.txt': 'x' });
    expect(loadInventory(dir)).toHaveLength(0);
    expect(loadInventory(join(dir, 'nope'))).toHaveLength(0);
  });

  it('完整 16 网元 fixture 全部解析出 nfType/addr/role 且 status=unknown', () => {
    dir = makeDir(buildFullFixture());
    const items = loadInventory(dir);
    expect(items).toHaveLength(16);
    for (const it of items) {
      expect(it.nfType).toBeTruthy();
      expect(it.addr).toMatch(/^127\.|^172\./);
      expect(it.role).toBeTruthy();
      expect(it.status).toBe('unknown');
      expect(KNOWN_NF_TYPES).toContain(it.nfType);
    }
  });

  it('resolveConfigDir 优先 OGS_CONFIG_DIR，其次运行时目录', () => {
    const old = process.env.OGS_CONFIG_DIR;
    process.env.OGS_CONFIG_DIR = '/tmp/ogs-cfg';
    try {
      expect(resolveConfigDir()).toBe('/tmp/ogs-cfg');
    } finally {
      if (old === undefined) delete process.env.OGS_CONFIG_DIR;
      else process.env.OGS_CONFIG_DIR = old;
    }
  });
});

/** 为 KNOWN 16 网元生成最小 fixture：5G 走 sbi.server.address，4G 走一个含 127 地址的 block。 */
function buildFullFixture(): Record<string, string> {
  const out: Record<string, string> = {};
  const defaultAddrs: Record<string, string> = {
    nrf: '127.0.0.10', scp: '127.0.0.200', amf: '127.0.0.5', smf: '127.0.0.4',
    upf: '127.0.0.7', ausf: '127.0.0.11', udm: '127.0.0.12', udr: '127.0.0.20',
    pcf: '127.0.0.13', nssf: '127.0.0.14', bsf: '127.0.0.15', mme: '127.0.0.2',
    hss: '127.0.0.8', sgwc: '127.0.0.3', sgwu: '127.0.0.6', pcrf: '127.0.0.9',
  };
  for (const t of KNOWN_NF_TYPES) {
    const addr = defaultAddrs[t];
    out[`${t}.yaml`] = `${t}:\n  sbi:\n    server:\n      - address: ${addr}\n        port: 7777\n`;
  }
  return out;
}
