import { Inject, Injectable } from '@nestjs/common';
import type { Model } from 'mongoose';
import { LifecycleTaskModel, type LifecycleTaskDoc } from './lifecycle-task.schema';

const LIFECYCLE_TASK_MODEL = 'LifecycleTask';

@Injectable()
export class LifecycleTaskRepository {
  constructor(@Inject(LIFECYCLE_TASK_MODEL) private readonly model: Model<LifecycleTaskDoc> = LifecycleTaskModel) {}

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
