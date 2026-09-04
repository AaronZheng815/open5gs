import { bootApp, get, post, nfYaml, type Booted } from './utils';
import { LifecycleService } from '../src/modules/lifecycle/lifecycle.service';
import { LifecycleTaskRepository } from '../src/db/lifecycle-task.repository';
import { AuditLogRepository } from '../src/db/audit-log.repository';

describe('lifecycle e2e (AC-5/AC-6/AC-12)', () => {
  let ctx: Booted;
  const execCalls: string[] = [];
  // activeMode=true → systemctl is-active 回 'active'；false → 回 'unknown'（unit not found 之类）
  let activeMode = true;
  const mockExec = async (cmd: string): Promise<{ code: number; stdout: string; stderr: string }> => {
    execCalls.push(cmd);
    if (cmd.startsWith('systemctl is-active')) {
      return { code: 0, stdout: activeMode ? 'active' : '', stderr: '' };
    }
    return { code: 0, stdout: '', stderr: '' }; // 动作命令一律成功 → task succeeded
  };

  beforeAll(async () => {
    ctx = await bootApp({
      dbTag: 'lifecycle',
      configFiles: { 'amf.yaml': nfYaml('amf', '127.0.0.5') },
      override: (b) =>
        b.overrideProvider(LifecycleService).useFactory({
          inject: [LifecycleTaskRepository, AuditLogRepository],
          factory: (tasks: LifecycleTaskRepository, audits: AuditLogRepository) =>
            new LifecycleService(tasks, audits, mockExec),
        }),
    });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('AC-6：is-active 回 active → 状态 active', async () => {
    const res = await get(ctx.instance, '/api/nfs/amf/lifecycle', ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    // statusOf 返回裸字符串（LifecycleStatus），非 JSON 包裹
    expect(res.payload).toBe('active');
  });

  it('AC-6：is-active 无输出（unit not found）→ 状态 unknown', async () => {
    activeMode = false;
    const res = await get(ctx.instance, '/api/nfs/amf/lifecycle', ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe('unknown');
    activeMode = true;
  });

  it('AC-5：restart → 202 + taskId；任务队列落库为 succeeded', async () => {
    const res = await post(ctx.instance, '/api/nfs/amf/lifecycle/restart', undefined, ctx.authHeaders);
    expect(res.statusCode).toBe(202);
    const { taskId } = JSON.parse(res.payload) as { taskId: string };
    expect(typeof taskId).toBe('string');
    expect(taskId.length).toBeGreaterThan(0);

    // 轮询任务到 succeeded（后台 execute 异步，与 run() 完成时间无关需等待）
    let times = 0;
    let taskStatus = '';
    while (times++ < 20) {
      const list = await get(ctx.instance, '/api/lifecycle-tasks?nfId=amf', ctx.authHeaders);
      const body = JSON.parse(list.payload) as { total: number; items: { id: string; status: string }[] };
      const task = body.items.find((t) => t.id === taskId);
      if (task) {
        taskStatus = task.status;
        if (task.status === 'succeeded') break;
      }
      await new Promise((r) => setTimeout(r, 30));
    }
    expect(taskStatus).toBe('succeeded');
    // run() 已完成，此刻断言下发的动作命令
    expect(execCalls).toContain('systemctl restart open5gs-amfd');
  });

  it('AC-12：审计落库含 lifecycle:restart（actor=admin, target=amf）', async () => {
    const res = await get(ctx.instance, '/api/audits', ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { total: number; items: { action: string; target: string; actor: string; result: string }[] };
    expect(body.total).toBeGreaterThan(0);
    const hit = body.items.find((i) => i.action === 'lifecycle:restart' && i.target === 'amf');
    expect(hit).toBeTruthy();
    expect(hit?.actor).toBe('admin');
    expect(hit?.result).toBe('succeeded');
  });
});
