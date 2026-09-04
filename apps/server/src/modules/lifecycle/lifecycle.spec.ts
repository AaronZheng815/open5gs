import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LifecycleService } from './lifecycle.service';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleTaskRepository } from '../../db/lifecycle-task.repository';
import { AuditLogRepository } from '../../db/audit-log.repository';
import type { ExecResult } from './status.util';

/** flush：等全部微任务 + 下一轮事件循环，让 fire-and-forget 的队列 run() 完整落定。 */
async function flush(): Promise<void> {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
}

const OK: ExecResult = { code: 0, stdout: '', stderr: '' };
const FAIL: ExecResult = { code: 5, stdout: '', stderr: 'Failed to restart open5gs-amfd.service' };

function makeRepos() {
  return {
    tasks: {
      create: jest.fn().mockResolvedValue({ _id: 'TASK123', nfId: 'amf', action: 'restart', status: 'queued', by: 'admin' }),
      updateStatus: jest.fn().mockResolvedValue({}),
      findLatestByNfId: jest.fn().mockResolvedValue([]),
    },
    audits: {
      append: jest.fn().mockResolvedValue({}),
      list: jest.fn().mockResolvedValue([]),
    },
  };
}

/** 每次测试独立 scoped 配置目录：备份落 root/config-backup，避免 /tmp 共享污染。 */
function makeConfigDir(): { root: string; dir: string } {
  const root = mkdtempSync(join(tmpdir(), 'nms-lc-'));
  const dir = join(root, 'ogs');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'amf.yaml'), 'amf:\n  sbi:\n    server:\n      - address: 127.0.0.5\n        port: 7777\n');
  return { root, dir };
}

function backupsOf(root: string): string[] {
  const bk = join(root, 'config-backup');
  if (!existsSync(bk)) return [];
  return readdirSync(bk).filter((f) => f.startsWith('amf-'));
}

describe('T-9 Lifecycle module (service)', () => {
  let repos: ReturnType<typeof makeRepos>;
  let cfg: { root: string; dir: string };
  let service: LifecycleService;
  let execFn: jest.Mock;

  beforeEach(() => {
    repos = makeRepos();
    cfg = makeConfigDir();
    execFn = jest.fn().mockResolvedValue(OK);
    service = new LifecycleService(
      repos.tasks as unknown as LifecycleTaskRepository,
      repos.audits as unknown as AuditLogRepository,
      execFn,
      cfg.dir,
    );
  });
  afterEach(() => rmSync(cfg.root, { recursive: true, force: true }));

  it('execAction 返回 202 语义：创建 queued 任务（AC-5），执行后 succeeded + 审计', async () => {
    const res = await service.execAction('amf', 'restart', 'admin');
    expect(res.taskId).toBe('TASK123');
    expect(repos.tasks.create).toHaveBeenCalledWith({ nfId: 'amf', action: 'restart', status: 'queued', by: 'admin' });
    // 触发 systemctl restart open5gs-amfd（命令与参数）
    await flush();
    expect(execFn).toHaveBeenCalledWith('systemctl restart open5gs-amfd');
    expect(repos.tasks.updateStatus).toHaveBeenCalledWith('TASK123', 'running');
    expect(repos.tasks.updateStatus).toHaveBeenCalledWith('TASK123', 'succeeded');
    // 写前备份（决策 2.4）
    expect(backupsOf(cfg.root)).toHaveLength(1);
  });

  it('execAction 失败路径：任务 failed + 审计含错误原因（AC-12）', async () => {
    execFn.mockResolvedValue(FAIL);
    await service.execAction('amf', 'restart', 'admin');
    await flush();
    expect(repos.tasks.updateStatus).toHaveBeenCalledWith('TASK123', 'failed');
    expect(repos.audits.append).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'admin', action: 'lifecycle:restart', target: 'amf', result: expect.stringContaining('Failed to restart') }),
    );
  });

  it('execAction 成功也写审计（AC-12），result=succeeded', async () => {
    await service.execAction('amf', 'restart', 'admin');
    await flush();
    expect(repos.audits.append).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'admin', action: 'lifecycle:restart', target: 'amf', result: 'succeeded' }),
    );
  });

  it('未知网元抛 NotFound；非法动作抛 BadRequest（AC-5 前置校验）', async () => {
    await expect(service.execAction('nope', 'restart', 'admin')).rejects.toThrow(NotFoundException);
    await expect(service.execAction('amf', 'reboot', 'admin')).rejects.toThrow(BadRequestException);
  });

  it('statusOf 转发 is-active 输出（AC-6）', async () => {
    const svc = new LifecycleService(
      repos.tasks as unknown as LifecycleTaskRepository,
      repos.audits as unknown as AuditLogRepository,
      jest.fn().mockResolvedValue({ ...OK, stdout: 'inactive\n', code: 3 }),
      cfg.dir,
    );
    await expect(svc.statusOf('amf')).resolves.toBe('inactive');
    await expect(svc.statusOf('nope')).rejects.toThrow(NotFoundException);
  });

  it('未注入 exec 时回退默认 execCapture（生产路径，不触发 systemctl）', async () => {
    const svc = new LifecycleService(repos.tasks as unknown as LifecycleTaskRepository, repos.audits as unknown as AuditLogRepository);
    // 未知网元在触达 exec 前抛错，验证构造函数能成功走默认 exec 回退分支
    await expect(svc.execAction('nope', 'restart', 'admin')).rejects.toThrow(NotFoundException);
  });

  it('未注入 configDir 时走 OGS_CONFIG_DIR 生产默认（决策 2.4 写前备份，scoped 不触仓库）', async () => {
    const root = mkdtempSync(join(tmpdir(), 'nms-lc-def-'));
    const dir = join(root, 'ogs');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'amf.yaml'), 'amf: {}\n');
    const prev = process.env.OGS_CONFIG_DIR;
    process.env.OGS_CONFIG_DIR = dir;
    try {
      const svc = new LifecycleService(repos.tasks as unknown as LifecycleTaskRepository, repos.audits as unknown as AuditLogRepository, execFn);
      await svc.execAction('amf', 'restart', 'admin');
      await flush();
      expect(execFn).toHaveBeenCalledWith('systemctl restart open5gs-amfd');
      expect(existsSync(join(root, 'config-backup'))).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.OGS_CONFIG_DIR;
      else process.env.OGS_CONFIG_DIR = prev;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('写前备份失败（配置缺失）不阻断生命周期动作（catch 分支）', async () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), 'nms-lc-emp-'));
    const emptyDir = join(emptyRoot, 'ogs');
    mkdirSync(emptyDir, { recursive: true });
    const svc2 = new LifecycleService(
      repos.tasks as unknown as LifecycleTaskRepository,
      repos.audits as unknown as AuditLogRepository,
      execFn,
      emptyDir, // 无 amf.yaml → backupFile 抛错 → catch
    );
    await expect(svc2.execAction('amf', 'restart', 'admin')).resolves.toEqual({ taskId: 'TASK123' });
    await flush();
    expect(repos.tasks.updateStatus).toHaveBeenCalledWith('TASK123', 'succeeded');
    rmSync(emptyRoot, { recursive: true, force: true });
  });
});

describe('T-9 Lifecycle controller', () => {
  it('GET status、POST exec 转发 service 并取 req.user 作为操作者（202）', async () => {
    const status = jest.fn().mockResolvedValue('inactive');
    const execAction = jest.fn().mockResolvedValue({ taskId: 'T1' });
    const fake = { statusOf: status, execAction } as unknown as LifecycleService;
    const ctrl = new LifecycleController(fake);

    await expect(ctrl.status('amf')).resolves.toBe('inactive');
    expect(status).toHaveBeenCalledWith('amf');

    const req = { user: { username: 'admin', roles: ['admin'] } };
    await expect(ctrl.exec('amf', 'restart', req as never)).resolves.toEqual({ taskId: 'T1' });
    expect(execAction).toHaveBeenCalledWith('amf', 'restart', 'admin');
  });

  it('req 无 user 时操作者回退 anonymous（不注入身份兜底）', async () => {
    const execAction = jest.fn().mockResolvedValue({ taskId: 'T2' });
    const fake = { statusOf: jest.fn(), execAction } as unknown as LifecycleService;
    const ctrl = new LifecycleController(fake);
    await expect(ctrl.exec('amf', 'restart', {} as never)).resolves.toEqual({ taskId: 'T2' });
    expect(execAction).toHaveBeenCalledWith('amf', 'restart', 'anonymous');
  });
});
