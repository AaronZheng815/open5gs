import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriberRepository } from '../../db/subscriber.repository';
import type { SubscriberDoc } from '../../db/subscriber.schema';

@Injectable()
export class SubscriberService {
  constructor(private readonly repo: SubscriberRepository) {}

  list(): Promise<SubscriberDoc[]> {
    return this.repo.findAll();
  }

  async get(imsi: string): Promise<SubscriberDoc> {
    const doc = await this.repo.findOneByImsi(imsi);
    if (!doc) throw new NotFoundException(`subscriber ${imsi} 不存在`);
    return doc;
  }

  create(doc: Partial<SubscriberDoc>): Promise<SubscriberDoc> {
    if (!doc.imsi) throw new BadRequestException('imsi 必填');
    return this.repo.create(doc);
  }

  async update(imsi: string, doc: Partial<SubscriberDoc>): Promise<SubscriberDoc> {
    const updated = await this.repo.updateByImsi(imsi, doc);
    if (!updated) throw new NotFoundException(`subscriber ${imsi} 不存在`);
    return updated;
  }

  async delete(imsi: string): Promise<void> {
    const doc = await this.repo.findOneByImsi(imsi);
    if (!doc) throw new NotFoundException(`subscriber ${imsi} 不存在`);
    await this.repo.deleteByImsi(imsi);
  }
}
