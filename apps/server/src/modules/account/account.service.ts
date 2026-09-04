import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountRepository } from '../../db/account.repository';
import type { AccountDoc } from '../../db/account.schema';

@Injectable()
export class AccountService {
  constructor(private readonly repo: AccountRepository) {}

  list(): Promise<AccountDoc[]> {
    return this.repo.findAll();
  }

  async get(username: string): Promise<AccountDoc> {
    const doc = await this.repo.findOneByUsername(username);
    if (!doc) throw new NotFoundException(`account ${username} 不存在`);
    return doc;
  }

  create(doc: Partial<AccountDoc>): Promise<AccountDoc> {
    if (!doc.username) throw new BadRequestException('username 必填');
    return this.repo.create(doc);
  }

  async update(username: string, doc: Partial<AccountDoc>): Promise<AccountDoc> {
    const updated = await this.repo.updateByUsername(username, doc);
    if (!updated) throw new NotFoundException(`account ${username} 不存在`);
    return updated;
  }

  async delete(username: string): Promise<void> {
    const doc = await this.repo.findOneByUsername(username);
    if (!doc) throw new NotFoundException(`account ${username} 不存在`);
    await this.repo.deleteByUsername(username);
  }
}
