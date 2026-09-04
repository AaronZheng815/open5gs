import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import * as yaml from 'js-yaml';
import { dumpYaml, readYaml, resolveConfigPath } from './yaml.util';
import { diffConfig } from './diff.util';
import { backupFile, backupDir } from './backup.util';

function makeDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'nms-cfg-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}

describe('config yaml.util', () => {
  let dir: string;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it('readYaml 解析 .yaml 为结构化 content + path + raw', () => {
    dir = makeDir({ 'amf.yaml': 'amf:\n  sbi:\n    server:\n      - address: 127.0.0.5\n        port: 7777\n' });
    const doc = readYaml('amf', dir)!;
    expect(doc.id).toBe('amf');
    expect(doc.path).toBe(join(dir, 'amf.yaml'));
    const amfBlock = doc.content.amf as Record<string, unknown>;
    const sbi = amfBlock.sbi as Record<string, unknown>;
    const server = sbi.server as Array<Record<string, unknown>>;
    expect(server[0].address).toBe('127.0.0.5');
    expect(doc.raw).toContain('sbi');
  });

  it('readYaml 回退 .yaml.in；目录无文件返回 null', () => {
    dir = makeDir({ 'nrf.yaml.in': 'nrf:\n  sbi:\n    server:\n      - address: 127.0.0.10\n' });
    expect(resolveConfigPath('nrf', dir)).toBe(join(dir, 'nrf.yaml.in'));
    expect(readYaml('nope', dir)).toBeNull();
  });

  it('dumpYaml 生成可再解析的 yaml（round-trip 保留字段）', () => {
    const content = { smf: { sbi: { server: [{ address: '127.0.0.4', port: 7777 }] } }, mtu: 1400 };
    const text = dumpYaml(content);
    const reloaded = yaml.load(text) as Record<string, unknown>;
    expect(reloaded).toEqual(content);
  });
});

describe('config diff.util', () => {
  it('标量变更 → change（含路径）', () => {
    const out = diffConfig({ a: { b: 1 } }, { a: { b: 2 } });
    expect(out).toEqual([{ type: 'change', path: 'a.b', before: 1, after: 2 }]);
  });

  it('新增/删除键 → add/remove', () => {
    const out = diffConfig({ a: 1, gone: 1 }, { a: 1, added: 2 });
    expect(out).toContainEqual({ type: 'add', path: 'added', after: 2 });
    expect(out).toContainEqual({ type: 'remove', path: 'gone', before: 1 });
    expect(out).toHaveLength(2);
  });

  it('数组按下标 diff，多出元素 add', () => {
    const out = diffConfig({ arr: [{ x: 1 }] }, { arr: [{ x: 2 }, { x: 3 }] });
    expect(out).toContainEqual({ type: 'change', path: 'arr[0].x', before: 1, after: 2 });
    expect(out).toContainEqual({ type: 'add', path: 'arr[1]', after: { x: 3 } });
  });

  it('完全相同 → 空数组', () => {
    expect(diffConfig({ a: { b: [1, 2] } }, { a: { b: [1, 2] } })).toEqual([]);
  });
});

describe('config backup.util', () => {
  let dir: string;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it('backupFile 在 config-backup 生成时间戳后缀副本，内容一致', () => {
    dir = makeDir({ 'amf.yaml': 'amf:\n  sbi: {}\n' });
    const dest = backupFile('amf', dir);
    expect(dest.startsWith(backupDir(dir))).toBe(true);
    expect(basename(dest)).toMatch(/^amf-.*\.yaml$/);
    expect(readFileSync(dest, 'utf8')).toBe('amf:\n  sbi: {}\n');
  });

  it('backupDir 缺省为 configDir 父级/config-backup；可被覆盖', () => {
    const dir2 = makeDir({});
    expect(backupDir(dir2)).toBe(join(dir2, '..', 'config-backup'));
    expect(backupDir(dir2, '/custom/backup')).toBe('/custom/backup');
    rmSync(dir2, { recursive: true, force: true });
  });

  it('目标文件缺失时抛错', () => {
    dir = makeDir({});
    expect(() => backupFile('nope', dir)).toThrow('配置文件不存在');
  });
});
