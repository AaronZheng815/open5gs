import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { ProfileRepository } from '../../db/profile.repository';
import type { ProfileDoc } from '../../db/profile.schema';

const DOC: ProfileDoc = { title: 'default', subscriber_status: 0 } as ProfileDoc;

function makeRepo() {
  return {
    findAll: jest.fn(),
    findOneByTitle: jest.fn(),
    create: jest.fn(),
    updateByTitle: jest.fn(),
    deleteByTitle: jest.fn(),
  };
}

describe('T-6 Profile module', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: ProfileService;
  let controller: ProfileController;

  beforeEach(() => {
    repo = makeRepo();
    service = new ProfileService(repo as unknown as ProfileRepository);
    controller = new ProfileController(service);
  });

  it('list 委托 repo.findAll，控制器转发', async () => {
    repo.findAll.mockResolvedValue([DOC]);
    await expect(controller.list()).resolves.toEqual([DOC]);
  });

  it('get 找到返回、找不到抛 NotFound', async () => {
    repo.findOneByTitle.mockResolvedValue(DOC);
    await expect(controller.get('default')).resolves.toEqual(DOC);
    repo.findOneByTitle.mockResolvedValue(null);
    await expect(service.get('default')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create 缺 title 抛 BadRequest，否则落库', async () => {
    expect(() => service.create({} as Partial<ProfileDoc>)).toThrow(BadRequestException);
    repo.create.mockResolvedValue(DOC);
    await expect(controller.create(DOC)).resolves.toEqual(DOC);
    expect(repo.create).toHaveBeenCalledWith(DOC);
  });

  it('update 找到更新、找不到抛 NotFound', async () => {
    repo.updateByTitle.mockResolvedValue(DOC);
    await expect(controller.update('default', { subscriber_status: 1 })).resolves.toEqual(DOC);
    repo.updateByTitle.mockResolvedValue(null);
    await expect(service.update('default', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete 找到删除、找不到抛 NotFound', async () => {
    repo.findOneByTitle.mockResolvedValue(DOC);
    repo.deleteByTitle.mockResolvedValue({ deletedCount: 1 });
    await expect(controller.delete('default')).resolves.toBeUndefined();
    expect(repo.deleteByTitle).toHaveBeenCalledWith('default');
    repo.findOneByTitle.mockResolvedValue(null);
    await expect(service.delete('default')).rejects.toBeInstanceOf(NotFoundException);
  });
});
