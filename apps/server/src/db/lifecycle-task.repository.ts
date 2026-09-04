import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { LifecycleTaskModel, type LifecycleTaskDoc } from './lifecycle-task.schema';

@Injectable()
export class LifecycleTaskRepository {
  constructor(@InjectModel('LifecycleTask') private readonly model: Model<LifecycleTaskDoc> = LifecycleTaskModel) {}

  findLatestByNfId(nfId: string, limit = 10): Promise<LifecycleTaskDoc[]> {
    return this.model.find({ nfId }).sort({ createdAt: -1 }).limit(limit).lean().exec();
  }

  create(doc: Partial<LifecycleTaskDoc>): Promise<LifecycleTaskDoc> {
    return this.model.create(doc).then((saved) => saved.toObject() as LifecycleTaskDoc);
  }

  updateStatus(id: string, status: string): Promise<LifecycleTaskDoc | null> {
    return this.model.findByIdAndUpdate(id, { status }, { new: true }).lean().exec();
  }
}
