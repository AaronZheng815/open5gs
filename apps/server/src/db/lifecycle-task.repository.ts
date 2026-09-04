import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { LifecycleTaskModel, type LifecycleTaskDoc } from './lifecycle-task.schema';

@Injectable()
export class LifecycleTaskRepository {
  constructor(
    @InjectModel('LifecycleTask')
    private readonly model: Model<LifecycleTaskDoc> = LifecycleTaskModel,
  ) {}

  findLatestByNfId(nfId: string, limit = 10): Promise<LifecycleTaskDoc[]> {
    return this.model.find({ nfId }).sort({ createdAt: -1 }).limit(limit).lean().exec();
  }

  list(page = 1, pageSize = 20, filter?: { nfId?: string }): Promise<LifecycleTaskDoc[]> {
    const query: Record<string, unknown> = {};
    if (filter?.nfId) query.nfId = filter.nfId;
    return this.model
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
      .exec();
  }

  count(filter?: { nfId?: string }): Promise<number> {
    const query: Record<string, unknown> = {};
    if (filter?.nfId) query.nfId = filter.nfId;
    return this.model.countDocuments(query).exec();
  }

  create(doc: Partial<LifecycleTaskDoc>): Promise<LifecycleTaskDoc> {
    return this.model.create(doc).then((saved) => saved.toObject() as LifecycleTaskDoc);
  }

  updateStatus(id: string, status: string): Promise<LifecycleTaskDoc | null> {
    return this.model.findByIdAndUpdate(id, { status }, { new: true }).lean().exec();
  }
}
