import { bootApp, get, nfYaml, type Booted } from './utils';
import { AuditLogRepository } from '../src/db/audit-log.repository';
import { LifecycleTaskRepository } from '../src/db/lifecycle-task.repository';

describe('audit e2e (AC-12)', () => {
  let ctx: Booted;

  beforeAll(async () => {
    ctx = await bootApp({
      dbTag: 'audit',
      configFiles: { 'amf.yaml': nfYaml('amf', '127.0.0.5') },
    });
    const audits = ctx.app.get(AuditLogRepository);
    for (const actor of ['admin', 'ops', 'dev']) {
      await audits.append({ actor, action: 'config:apply', target: 'amf', result: 'succeeded', ts: new Date() });
    }
    // 任务隔离验证：也 seed 两条生命周期任务
    const tasks = ctx.app.get(LifecycleTaskRepository);
    await tasks.create({ nfId: 'amf', action: 'restart', status: 'succeeded', by: 'admin' });
    await tasks.create({ nfId: 'amf', action: 'stop', status: 'failed', by: 'ops' });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('AC-12 查询①：audits 返回 {items,total}，total=3', async () => {
    const res = await get(ctx.instance, '/api/audits', ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      items: { actor: string; action: string; target: string; ts: string }[];
      total: number;
    };
    expect(body.total).toBe(3);
    expect(body.items.length).toBe(3);
    expect(body.items.every((i) => typeof i.ts === 'string')).toBe(true);
  });

  it('AC-12 查询①按 actor 过滤', async () => {
    const res = await get(ctx.instance, '/api/audits?actor=ops', ctx.authHeaders);
    const body = JSON.parse(res.payload) as { total: number; items: { actor: string }[] };
    expect(body.total).toBe(1);
    expect(body.items[0].actor).toBe('ops');
  });

  it('AC-12 分页 pageSize 生效', async () => {
    const res = await get(ctx.instance, '/api/audits?page=1&pageSize=2', ctx.authHeaders);
    const body = JSON.parse(res.payload) as { items: unknown[]; total: number };
    expect(body.total).toBe(3);
    expect(body.items.length).toBe(2);
  });

  it('AC-12 查询②：lifecycle-tasks 返回任务列表（nfId 过滤）', async () => {
    const res = await get(ctx.instance, '/api/lifecycle-tasks?nfId=amf', ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      items: { nfId: string; action: string; status: string; created1: string }[];
      total: number;
    };
    expect(body.total).toBe(2);
    expect(body.items.every((t) => t.nfId === 'amf')).toBe(true);
    const actions = body.items.map((t) => t.action).sort();
    expect(actions).toEqual(['restart', 'stop']);
  });
});
