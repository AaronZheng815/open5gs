import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { AccountRepository } from '../../db/account.repository';
import type { AccountDoc } from '../../db/account.schema';

const DOC: AccountDoc = { username: 'admin', roles: ['admin'], salt: 's', hash: 'h' } as AccountDoc;

function makeRepo() {
  return {
    findAll: jest.fn(),
    findOneByUsername: jest.fn(),
    create: jest.fn(),
    updateByUsername: jest.fn(),
    deleteByUsername: jest.fn(),
  };
}

describe('T-6 Account module', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: AccountService;
  let controller: AccountController;

  beforeEach(() => {
    repo = makeRepo();
    service = new AccountService(repo as unknown as AccountRepository);
    controller = new AccountController(service);
  });

  it('list 委托 repo.findAll，控制器转发', async () => {
    repo.findAll.mockResolvedValue([DOC]);
    await expect(controller.list()).resolves.toEqual([DOC]);
  });

  it('get 找到返回、找不到抛 NotFound', async () => {
    repo.findOneByUsername.mockResolvedValue(DOC);
    await expect(controller.get('admin')).resolves.toEqual(DOC);
    repo.findOneByUsername.mockResolvedValue(null);
    await expect(service.get('admin')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create 缺 username 抛 BadRequest，否则落库', async () => {
    expect(() => service.create({} as Partial<AccountDoc>)).toThrow(BadRequestException);
    repo.create.mockResolvedValue(DOC);
    await expect(controller.create(DOC)).resolves.toEqual(DOC);
    expect(repo.create).toHaveBeenCalledWith(DOC);
  });

  it('update 找到更新、找不到抛 NotFound', async () => {
    repo.updateByUsername.mockResolvedValue(DOC);
    await expect(controller.update('admin', { roles: ['ops'] })).resolves.toEqual(DOC);
    repo.updateByUsername.mockResolvedValue(null);
    await expect(service.update('admin', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete 找到删除、找不到抛 NotFound', async () => {
    repo.findOneByUsername.mockResolvedValue(DOC);
    repo.deleteByUsername.mockResolvedValue({ deletedCount: 1 });
    await expect(controller.delete('admin')).resolves.toBeUndefined();
    expect(repo.deleteByUsername).toHaveBeenCalledWith('admin');
    repo.findOneByUsername.mockResolvedValue(null);
    await expect(service.delete('admin')).rejects.toBeInstanceOf(NotFoundException);
  });
});
