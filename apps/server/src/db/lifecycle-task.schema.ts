import { Schema, model } from 'mongoose';
import type { LifecycleTask } from '@open5gs/shared';

/** 新增 lifecycle_tasks 集合（PLAN §6/D-2）：按 (nfId, createdAt) 索引，服务生命周期任务追溯。 */
export const LifecycleTaskSchema = new Schema(
  {
    nfId: { $type: String, required: true },
    action: { $type: String, enum: ['start', 'stop', 'restart', 'reload'], required: true },
    status: { $type: String, enum: ['queued', 'running', 'succeeded', 'failed', 'rolled_back'], required: true },
    by: { $type: String, required: true },
    createdAt: { $type: Date, default: Date.now },
  },
  { typeKey: '$type', collection: 'lifecycle_tasks' },
);

LifecycleTaskSchema.index({ nfId: 1, createdAt: -1 });

export interface LifecycleTaskDoc {
  nfId: string;
  action: string;
  status: string;
  by: string;
  createdAt: Date;
}

export const LifecycleTaskModel = model<LifecycleTaskDoc>('LifecycleTask', LifecycleTaskSchema);
export type { LifecycleTask };
