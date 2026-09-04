import type { Model } from 'mongoose';
import { SubscriberRepository } from './subscriber.repository';
import { ProfileRepository } from './profile.repository';
import { AccountRepository } from './account.repository';
import { AuditLogRepository } from './audit-log.repository';
import { LifecycleTaskRepository } from './lifecycle-task.repository';
import type { SubscriberDoc } from './subscriber.schema';
import type { ProfileDoc } from './profile.schema';
import type { AccountDoc } from './account.schema';
import type { AuditLogDoc } from './audit-log.schema';
import type { LifecycleTaskDoc } from './lifecycle-task.schema';

interface QueryLike {
  sort: jest.Mock<QueryLike>;
  skip: jest.Mock<QueryLike>;
  limit: jest.Mock<QueryLike>;
  lean: jest.Mock<QueryLike>;
  exec: jest.Mock<Promise<unknown>>;
}

interface ModelMock {
  find: jest.Mock<QueryLike>;
  findOne: jest.Mock<QueryLike>;
  findOneAndUpdate: jest.Mock<QueryLike>;
  findByIdAndUpdate: jest.Mock<QueryLike>;
  deleteOne: jest.Mock<unknown>;
  create: jest.Mock<Promise<{ toObject: () => unknown }>>;
}

function makeQuery(resolveValue: unknown): () => QueryLike {
  return jest.fn(() => {
    const q: QueryLike = {
      sort: jest.fn(() => q),
      skip: jest.fn(() => q),
      limit: jest.fn(() => q),
      lean: jest.fn(() => q),
      exec: jest.fn(() => Promise.resolve(resolveValue)),
    };
    return q;
  });
}

function makeModel(): ModelMock {
  return {
    find: makeQuery([{ imsi: '460111234560001' }]) as unknown as jest.Mock<QueryLike>,
    findOne: makeQuery({ imsi: '460111234560001' }) as unknown as jest.Mock<QueryLike>,
    findOneAndUpdate: makeQuery({ imsi: '460111234560001' }) as unknown as jest.Mock<QueryLike>,
    findByIdAndUpdate: makeQuery({ _id: 'abc' }) as unknown as jest.Mock<QueryLike>,
    deleteOne: makeQuery({ deletedCount: 1 }) as unknown as jest.Mock<QueryLike>,
    create: jest.fn(() => Promise.resolve({ toObject: () => ({ imsi: '460111234560001' }) })),
  };
}

const asModel = <T>(m: ModelMock) => m as unknown as Model<T>;

describe('T-4 repository CRUD 基本方法', () => {
  it('repository 未注入 model 时回退到真实 Mongoose model（默认构造分支）', () => {
    expect(new SubscriberRepository()).toBeDefined();
  });

  it('subscriber: findAll / findOneByImsi / create / updateByImsi / deleteByImsi', async () => {
    const mock = makeModel();
    const repo = new SubscriberRepository(asModel<SubscriberDoc>(mock));

    await expect(repo.findAll()).resolves.toEqual([{ imsi: '460111234560001' }]);
    await expect(repo.findOneByImsi('460111234560001')).resolves.toEqual({ imsi: '460111234560001' });
    await expect(repo.create({ imsi: '460111234560001' })).resolves.toEqual({ imsi: '460111234560001' });
    await expect(repo.updateByImsi('460111234560001', { subscriber_status: 1 })).resolves.toEqual({
      imsi: '460111234560001',
    });
    await expect(repo.deleteByImsi('460111234560001')).resolves.toEqual({ deletedCount: 1 });

    expect(mock.find).toHaveBeenCalledTimes(1);
    expect(mock.findOne).toHaveBeenCalledWith({ imsi: '460111234560001' });
    expect(mock.create).toHaveBeenCalledWith({ imsi: '460111234560001' });
    expect(mock.findOneAndUpdate).toHaveBeenCalledWith({ imsi: '460111234560001' }, { subscriber_status: 1 }, { new: true });
    expect(mock.deleteOne).toHaveBeenCalledWith({ imsi: '460111234560001' });
  });

  it('profile: findOneByTitle / create / updateByTitle / deleteByTitle', async () => {
    const mock = makeModel();
    const repo = new ProfileRepository(asModel<ProfileDoc>(mock));
    await expect(repo.findOneByTitle('default')).resolves.toEqual({ imsi: '460111234560001' });
    await expect(repo.create({ title: 'default' })).resolves.toEqual({ imsi: '460111234560001' });
    await expect(repo.updateByTitle('default', { subscriber_status: 1 })).resolves.toEqual({ imsi: '460111234560001' });
    await expect(repo.deleteByTitle('default')).resolves.toEqual({ deletedCount: 1 });
    expect(mock.findOne).toHaveBeenCalledWith({ title: 'default' });
  });

  it('account: findOneByUsername / create / updateByUsername / deleteByUsername', async () => {
    const mock = makeModel();
    const repo = new AccountRepository(asModel<AccountDoc>(mock));
    await expect(repo.findOneByUsername('admin')).resolves.toEqual({ imsi: '460111234560001' });
    await expect(repo.create({ username: 'admin' })).resolves.toEqual({ imsi: '460111234560001' });
    await expect(repo.updateByUsername('admin', { roles: ['admin'] })).resolves.toEqual({ imsi: '460111234560001' });
    await expect(repo.deleteByUsername('admin')).resolves.toEqual({ deletedCount: 1 });
    expect(mock.findOne).toHaveBeenCalledWith({ username: 'admin' });
  });

  it('audit-log: list 带 actor 过滤 + 分页排序；append', async () => {
    const mock = makeModel();
    const repo = new AuditLogRepository(asModel<AuditLogDoc>(mock));
    await expect(repo.list()).resolves.toEqual([{ imsi: '460111234560001' }]);
    await expect(repo.list(2, 10, { actor: 'admin' })).resolves.toEqual([{ imsi: '460111234560001' }]);
    const query = mock.find.mock.results[1].value as QueryLike;
    expect(query.sort).toHaveBeenCalledWith({ ts: -1 });
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(10);
    await expect(repo.append({ actor: 'admin', action: 'start', target: 'amf', result: 'ok', ts: new Date() })).resolves.toEqual({ imsi: '460111234560001' });
  });

  it('lifecycle-task: findLatestByNfId / create / updateStatus', async () => {
    const mock = makeModel();
    const repo = new LifecycleTaskRepository(asModel<LifecycleTaskDoc>(mock));
    await expect(repo.findLatestByNfId('amf-1')).resolves.toEqual([{ imsi: '460111234560001' }]);
    const query = mock.find.mock.results[0].value as QueryLike;
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.limit).toHaveBeenCalledWith(10);
    await expect(repo.create({ nfId: 'amf-1', action: 'start', status: 'queued', by: 'admin' })).resolves.toEqual({ imsi: '460111234560001' });
    await expect(repo.updateStatus('abc', 'running')).resolves.toEqual({ _id: 'abc' });
  });
});
