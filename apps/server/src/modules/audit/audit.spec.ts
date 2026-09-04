import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditLogRepository } from '../../db/audit-log.repository';
import { LifecycleTaskRepository } from '../../db/lifecycle-task.repository';

function makeRepos() {
  return {
    audits: {
      list: jest
        .fn()
        .mockResolvedValue([
          {
            actor: 'admin',
            action: 'lifecycle:restart',
            target: 'amf',
            result: 'ok',
            ts: new Date('2026-09-04T00:00:00Z'),
          },
        ]),
      count: jest.fn().mockResolvedValue(5),
    },
    tasks: {
      list: jest
        .fn()
        .mockResolvedValue([
          {
            _id: 'T123',
            nfId: 'amf',
            action: 'restart',
            status: 'queued',
            by: 'admin',
            createdAt: new Date('2026-09-04T00:00:00Z'),
          },
        ]),
      count: jest.fn().mockResolvedValue(3),
    },
  };
}

describe('T-12 audit (service)', () => {
  it('listAudits 将 ts(Date) 映射为 ISO 字符串 + 返回分页结构（AC-12 查询①）', async () => {
    const repos = makeRepos();
    const svc = new AuditService(
      repos.audits as unknown as AuditLogRepository,
      repos.tasks as unknown as LifecycleTaskRepository,
    );
    const out = await svc.listAudits(1, 20, 'admin');
    expect(out.total).toBe(5);
    expect(out.items[0]).toEqual({
      actor: 'admin',
      action: 'lifecycle:restart',
      target: 'amf',
      result: 'ok',
      ts: '2026-09-04T00:00:00.000Z',
    });
    expect(repos.audits.list).toHaveBeenCalledWith(1, 20, { actor: 'admin' });
    expect(repos.audits.count).toHaveBeenCalledWith({ actor: 'admin' });
  });

  it('listAudits 无过滤参数时不传 filter', async () => {
    const repos = makeRepos();
    const svc = new AuditService(
      repos.audits as unknown as AuditLogRepository,
      repos.tasks as unknown as LifecycleTaskRepository,
    );
    await svc.listAudits(2, 50, undefined);
    expect(repos.audits.list).toHaveBeenCalledWith(2, 50, undefined);
  });

  it('listTasks 将 _id→id + createdAt(Date)→ISO，返回分页结构（AC-12 查询②）', async () => {
    const repos = makeRepos();
    const svc = new AuditService(
      repos.audits as unknown as AuditLogRepository,
      repos.tasks as unknown as LifecycleTaskRepository,
    );
    const out = await svc.listTasks(1, 20, 'amf');
    expect(out.total).toBe(3);
    expect(out.items[0]).toEqual({
      id: 'T123',
      nfId: 'amf',
      action: 'restart',
      status: 'queued',
      by: 'admin',
      createdAt: '2026-09-04T00:00:00.000Z',
    });
    expect(repos.tasks.list).toHaveBeenCalledWith(1, 20, { nfId: 'amf' });
    expect(repos.tasks.count).toHaveBeenCalledWith({ nfId: 'amf' });
  });

  it('listTasks 无过滤参数时不传 filter', async () => {
    const repos = makeRepos();
    const svc = new AuditService(
      repos.audits as unknown as AuditLogRepository,
      repos.tasks as unknown as LifecycleTaskRepository,
    );
    await svc.listTasks(1, 20, undefined);
    expect(repos.tasks.list).toHaveBeenCalledWith(1, 20, undefined);
  });
});

describe('T-12 audit (controller)', () => {
  it('GET /api/audits 转发 listAudits；默认 page=1/pageSize=20', async () => {
    const listAudits = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const fake = { listAudits } as unknown as AuditService;
    const ctrl = new AuditController(fake);
    const out = await ctrl.audits(undefined, undefined, undefined);
    expect(out).toEqual({ items: [], total: 0 });
    expect(listAudits).toHaveBeenCalledWith(1, 20, undefined);
  });

  it('GET /api/lifecycle-tasks 转发 listTasks，解析数字查询参数', async () => {
    const listTasks = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const fake = { listTasks } as unknown as AuditService;
    const ctrl = new AuditController(fake);
    await ctrl.tasks('3', '50', undefined);
    expect(listTasks).toHaveBeenCalledWith(3, 50, undefined);
  });
});
