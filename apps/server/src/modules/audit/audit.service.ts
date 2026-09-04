import { Injectable } from '@nestjs/common';
import type {
  AuditLog,
  AuditLogList,
  LifecycleAction,
  LifecycleTask,
  LifecycleTaskList,
  TaskStatus,
} from '@open5gs/shared';
import { AuditLogRepository } from '../../db/audit-log.repository';
import { LifecycleTaskRepository } from '../../db/lifecycle-task.repository';
import type { AuditLogDoc } from '../../db/audit-log.schema';
import type { LifecycleTaskDoc } from '../../db/lifecycle-task.schema';

/** Mongo Date → ISO 字符串（共享 AuditLog.ts 为 string.datetime）。 */
function toAuditLog(doc: AuditLogDoc): AuditLog {
  return {
    actor: doc.actor,
    action: doc.action,
    target: doc.target,
    result: doc.result,
    ts: new Date(doc.ts).toISOString(),
  };
}

/** Mongo lean doc（含 _id，无虚拟 id）→ 共享 LifecycleTask（id 取 _id，枚举强转）。 */
function toLifecycleTask(doc: LifecycleTaskDoc): LifecycleTask {
  return {
    id: String((doc as LifecycleTaskDoc & { _id?: unknown })._id ?? ''),
    nfId: doc.nfId,
    action: doc.action as LifecycleAction,
    status: doc.status as TaskStatus,
    by: doc.by,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

@Injectable()
export class AuditService {
  constructor(
    private readonly audits: AuditLogRepository,
    private readonly tasks: LifecycleTaskRepository,
  ) {}

  /** AC-12 查询①：审计日志列表，按 (actor, ts) 倒序 + 分页。 */
  async listAudits(page: number, pageSize: number, actor?: string): Promise<AuditLogList> {
    const filter = actor ? { actor } : undefined;
    const items = await this.audits.list(page, pageSize, filter);
    const total = await this.audits.count(filter);
    return { items: items.map(toAuditLog), total };
  }

  /** AC-12 查询②：生命周期任务列表，按 (nfId, createdAt) 倒序 + 分页。 */
  async listTasks(page: number, pageSize: number, nfId?: string): Promise<LifecycleTaskList> {
    const filter = nfId ? { nfId } : undefined;
    const items = await this.tasks.list(page, pageSize, filter);
    const total = await this.tasks.count(filter);
    return { items: items.map(toLifecycleTask), total };
  }
}
