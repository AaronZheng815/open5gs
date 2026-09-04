import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriberService } from './subscriber.service';
import { SubscriberController } from './subscriber.controller';
import { SubscriberRepository } from '../../db/subscriber.repository';
import type { SubscriberDoc } from '../../db/subscriber.schema';

const DOC: SubscriberDoc = { imsi: '460111234560001', subscriber_status: 0 } as SubscriberDoc;

function makeRepo() {
  return {
    findAll: jest.fn(),
    findOneByImsi: jest.fn(),
    create: jest.fn(),
    updateByImsi: jest.fn(),
    deleteByImsi: jest.fn(),
  };
}

describe('T-6 Subscriber module', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: SubscriberService;
  let controller: SubscriberController;

  beforeEach(() => {
    repo = makeRepo();
    service = new SubscriberService(repo as unknown as SubscriberRepository);
    controller = new SubscriberController(service);
  });

  it('list 委托 repo.findAll，控制器转发', async () => {
    repo.findAll.mockResolvedValue([DOC]);
    await expect(controller.list()).resolves.toEqual([DOC]);
    expect(repo.findAll).toHaveBeenCalledTimes(1);
  });

  it('get 找到返回、找不到抛 NotFound', async () => {
    repo.findOneByImsi.mockResolvedValue(DOC);
    await expect(controller.get(DOC.imsi)).resolves.toEqual(DOC);
    repo.findOneByImsi.mockResolvedValue(null);
    await expect(service.get(DOC.imsi)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create 缺 imsi 抛 BadRequest，否则落库', async () => {
    expect(() => service.create({} as Partial<SubscriberDoc>)).toThrow(BadRequestException);
    repo.create.mockResolvedValue(DOC);
    await expect(controller.create(DOC)).resolves.toEqual(DOC);
    expect(repo.create).toHaveBeenCalledWith(DOC);
  });

  it('update 找到更新、找不到抛 NotFound', async () => {
    repo.updateByImsi.mockResolvedValue(DOC);
    await expect(controller.update(DOC.imsi, { subscriber_status: 1 })).resolves.toEqual(DOC);
    repo.updateByImsi.mockResolvedValue(null);
    await expect(service.update(DOC.imsi, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete 找到删除、找不到抛 NotFound', async () => {
    repo.findOneByImsi.mockResolvedValue(DOC);
    repo.deleteByImsi.mockResolvedValue({ deletedCount: 1 });
    await expect(controller.delete(DOC.imsi)).resolves.toBeUndefined();
    expect(repo.deleteByImsi).toHaveBeenCalledWith(DOC.imsi);
    repo.findOneByImsi.mockResolvedValue(null);
    await expect(service.delete(DOC.imsi)).rejects.toBeInstanceOf(NotFoundException);
  });
});
