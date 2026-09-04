import { bootApp, get, post, nfYaml, type Booted } from './utils';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

describe('config e2e (AC-2/AC-3/AC-4)', () => {
  let ctx: Booted;

  beforeAll(async () => {
    ctx = await bootApp({
      dbTag: 'config',
      configFiles: { 'amf.yaml': nfYaml('amf', '127.0.0.5'), 'smf.yaml': nfYaml('smf', '127.0.0.4') },
    });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('未带 token → 401（JwtAuthGuard）', async () => {
    const res = await get(ctx.instance, '/api/nfs/amf/config', {});
    expect(res.statusCode).toBe(401);
  });

  it('AC-2：读取已存在网元结构化配置 → 200', async () => {
    const res = await get(ctx.instance, '/api/nfs/amf/config', ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    const doc = JSON.parse(res.payload) as { id: string; content: Record<string, unknown> };
    expect(doc.id).toBe('amf');
    expect(doc.content.amf).toBeTruthy();
  });

  it('未知网元 → 404', async () => {
    const res = await get(ctx.instance, '/api/nfs/sepp/config', ctx.authHeaders);
    expect(res.statusCode).toBe(404);
  });

  it('AC-3：dry_run=true 只返回 diff，不落盘', async () => {
    const before = readFileSync(join(ctx.configDir, 'amf.yaml'), 'utf8');
    const res = await post(ctx.instance, '/api/nfs/amf/config?dry_run=true', { content: { amf: { changed: true } } }, ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { dryRun: boolean; diff: unknown[] };
    expect(body.dryRun).toBe(true);
    expect(body.diff.length).toBeGreaterThan(0);
    // 文件未变
    expect(readFileSync(join(ctx.configDir, 'amf.yaml'), 'utf8')).toBe(before);
  });

  it('AC-4：dry_run=false 落盘 + 生成写前备份', async () => {
    const res = await post(ctx.instance, '/api/nfs/amf/config?dry_run=false', { content: { amf: { port: 7777 } } }, ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { dryRun: boolean };
    expect(body.dryRun).toBe(false);
    // 落盘：amf.yaml 现在包含新内容
    const written = readFileSync(join(ctx.configDir, 'amf.yaml'), 'utf8');
    expect(written).toContain('port');
    // 备份：<configDir 父级>/config-backup/amf-*.yaml 存在
    const backupDir = join(dirname(ctx.configDir), 'config-backup');
    expect(existsSync(backupDir)).toBe(true);
    const backups = readdirSync(backupDir).filter((f) => f.startsWith('amf-') && f.endsWith('.yaml'));
    expect(backups.length).toBeGreaterThanOrEqual(1);
  });
});
