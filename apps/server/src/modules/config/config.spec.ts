import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';

/** 备份目录落在 root/config-backup（每个测试一个独立 root，避免 /tmp 共享污染）。 */
function makeScopedRoot(files: Record<string, string>): { root: string; dir: string } {
  const root = mkdtempSync(join(tmpdir(), 'nms-cfg-svc-'));
  const dir = join(root, 'ogs');
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return { root, dir };
}

function backupsOf(root: string): string[] {
  const bk = join(root, 'config-backup');
  if (!existsSync(bk)) return [];
  return readdirSync(bk).filter((f) => f.startsWith('amf-'));
}

const FIXTURE = 'amf:\n  sbi:\n    server:\n      - address: 127.0.0.5\n        port: 7777\n';

describe('Config service', () => {
  let root: string;
  let dir: string;
  let service: ConfigService;

  beforeEach(() => {
    const r = makeScopedRoot({ 'amf.yaml': FIXTURE });
    root = r.root;
    dir = r.dir;
    service = new ConfigService();
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('readConfig 返回结构化 JSON（AC-2），字段与 yaml 对应', () => {
    const doc = service.readConfig('amf', dir);
    expect(doc.id).toBe('amf');
    expect(doc.path).toBe(join(dir, 'amf.yaml'));
    const amfBlock = doc.content.amf as Record<string, unknown>;
    const sbi = amfBlock.sbi as Record<string, unknown>;
    const server = sbi.server as Array<Record<string, unknown>>;
    expect(server[0].address).toBe('127.0.0.5');
  });

  it('readConfig 未知网元抛 NotFound，id 非法（含 /）同抛 NotFound', () => {
    expect(() => service.readConfig('nope', dir)).toThrow(NotFoundException);
    expect(() => service.readConfig('../../etc/passwd', dir)).toThrow(NotFoundException);
  });

  it('applyConfig dry_run=true 返回 diff 且不落盘（AC-3）', () => {
    const before = readFileSync(join(dir, 'amf.yaml'), 'utf8');
    const res = service.applyConfig('amf', { content: { amf: { sbi: { server: [{ address: '127.0.0.9', port: 7777 }] } } } }, true, dir);
    expect(res.dryRun).toBe(true);
    expect(res.diff).toContainEqual({ type: 'change', path: 'amf.sbi.server[0].address', before: '127.0.0.5', after: '127.0.0.9' });
    // 文件内容不变
    expect(readFileSync(join(dir, 'amf.yaml'), 'utf8')).toBe(before);
    // 无备份生成
    expect(backupsOf(root)).toHaveLength(0);
  });

  it('applyConfig dry_run=false 写回文件 + 生成写前备份（AC-4）', () => {
    const res = service.applyConfig('amf', { content: { amf: { sbi: { server: [{ address: '127.0.0.9', port: 7777 }] } } } }, false, dir);
    expect(res.dryRun).toBe(false);
    // 文件被写入
    const updated = readFileSync(join(dir, 'amf.yaml'), 'utf8');
    expect(updated).toContain('127.0.0.9');
    // config-backup 出现写前备份
    const backups = backupsOf(root);
    expect(backups).toHaveLength(1);
    expect(readFileSync(join(dir, '..', 'config-backup', backups[0]), 'utf8')).toBe(FIXTURE); // 备份为写前内容
  });

  it('applyConfig 无差异且 dry_run=false 不写不备份', () => {
    const before = readFileSync(join(dir, 'amf.yaml'), 'utf8');
    const res = service.applyConfig('amf', { content: { amf: { sbi: { server: [{ address: '127.0.0.5', port: 7777 }] } } } }, false, dir);
    expect(res.diff).toEqual([]);
    expect(readFileSync(join(dir, 'amf.yaml'), 'utf8')).toBe(before);
    expect(backupsOf(root)).toHaveLength(0);
  });
});

describe('Config controller', () => {
  it('GET 读、POST 转发 service（dry_run 解析）', async () => {
    const doc = { id: 'amf', path: '/x', content: { amf: {} } };
    const diff = { id: 'amf', dryRun: true, diff: [] };
    const fake = {
      readConfig: jest.fn(() => doc),
      applyConfig: jest.fn(() => diff),
    } as unknown as ConfigService;
    const ctrl = new ConfigController(fake);
    expect(ctrl.read('amf')).toBe(doc);
    expect(ctrl.apply('amf', { content: {} } as never, 'true')).toBe(diff);
    expect(fake.applyConfig).toHaveBeenCalledWith('amf', { content: {} }, true);
    ctrl.apply('amf', { content: {} } as never, undefined);
    expect(fake.applyConfig).toHaveBeenLastCalledWith('amf', { content: {} }, false);
  });
});
