import { Schema, model } from 'mongoose';
import type { AuditLog } from '@open5gs/shared';

/** 新增 audit_logs 集合（PLAN §6/D-2）：审计查询按 (actor, ts) 索引。 */
export const AuditLogSchema = new Schema(
  {
    actor: { $type: String, required: true },
    action: { $type: String, required: true },
    target: { $type: String, required: true },
    result: { $type: String, required: true },
    ts: { $type: Date, default: Date.now },
  },
  { typeKey: '$type', collection: 'audit_logs' },
);

AuditLogSchema.index({ actor: 1, ts: -1 });

export interface AuditLogDoc {
  actor: string;
  action: string;
  target: string;
  result: string;
  ts: Date;
}

export const AuditLogModel = model<AuditLogDoc>('AuditLog', AuditLogSchema);
export type { AuditLog };
