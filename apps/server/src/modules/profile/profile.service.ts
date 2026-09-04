import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProfileRepository } from '../../db/profile.repository';
import type { ProfileDoc } from '../../db/profile.schema';

@Injectable()
export class ProfileService {
  constructor(private readonly repo: ProfileRepository) {}

  list(): Promise<ProfileDoc[]> {
    return this.repo.findAll();
  }

  async get(title: string): Promise<ProfileDoc> {
    const doc = await this.repo.findOneByTitle(title);
    if (!doc) throw new NotFoundException(`profile ${title} 不存在`);
    return doc;
  }

  create(doc: Partial<ProfileDoc>): Promise<ProfileDoc> {
    if (!doc.title) throw new BadRequestException('title 必填');
    return this.repo.create(doc);
  }

  async update(title: string, doc: Partial<ProfileDoc>): Promise<ProfileDoc> {
    const updated = await this.repo.updateByTitle(title, doc);
    if (!updated) throw new NotFoundException(`profile ${title} 不存在`);
    return updated;
  }

  async delete(title: string): Promise<void> {
    const doc = await this.repo.findOneByTitle(title);
    if (!doc) throw new NotFoundException(`profile ${title} 不存在`);
    await this.repo.deleteByTitle(title);
  }
}
