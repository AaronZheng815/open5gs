import { Inject, Injectable } from '@nestjs/common';
import type { Model } from 'mongoose';
import { AuditLogModel, type AuditLogDoc } from './audit-log.schema';

const AUDIT_LOG_MODEL = 'AuditLog';

@Injectable()
export class AuditLogRepository {
  constructor(@Inject(AUDIT_LOG_MODEL) private readonly model: Model<AuditLogDoc> = AuditLogModel) {}

  list(page = 1, pageSize = 20, filter?: { actor?: string }): Promise<AuditLogDoc[]> {
    const query: Record<string, unknown> = {};
    if (filter?.actor) query.actor = filter.actor;
    return this.model
      .find(query)
      .sort({ ts: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
      .exec();
  }

  append(entry: Pick<AuditLogDoc, 'actor' | 'action' | 'target' | 'result' | 'ts'>): Promise<AuditLogDoc> {
    return this.model.create(entry).then((saved) => saved.toObject() as AuditLogDoc);
  }
}
