import type { LifecycleAction, TaskStatus } from '@open5gs/shared';
import { LifecycleTaskRepository } from '../../db/lifecycle-task.repository';
import { AuditLogRepository } from '../../db/audit-log.repository';
import { backupFile } from '../config/backup.util';
import { resolveConfigDir } from '../asset/inventory.loader';
import { execCapture, unitFor, type ExecResult } from './status.util';

export type ExecFn = (cmd: string) => Promise<ExecResult>;

/**
 * 生命周期异步任务执行器（PLAN §7 状态机 Queued→Running→Succeeded/Failed）。
 * 执行前对配置做写前备份（决策 2.4），执行后写审计（AC-12）。
 */
export class TaskQueue {
  constructor(
    private readonly tasks: LifecycleTaskRepository,
    private readonly audits: AuditLogRepository,
    private readonly exec: ExecFn = execCapture,
    private readonly configDir?: string,
  ) {}

  /** AC-5：创建 queued 任务并异步触发执行，立即返回任务 id。 */
  async submit(id: string, action: LifecycleAction, by: string): Promise<string> {
    const created = await this.tasks.create({ nfId: id, action, status: 'queued', by });
    // 仓库 create 返回 toObject()（剥掉 mongoose 虚拟 id），无从 _id 取任务 id
    const taskId = String((created as { _id?: unknown })._id);
    void this.run(taskId, id, action, by);
    return taskId;
  }

  private async run(taskId: string, id: string, action: LifecycleAction, by: string): Promise<void> {
    await this.tasks.updateStatus(taskId, 'running');
    // 操作前配置备份（决策 2.4）；无配置可备份时忽略
    try {
      await backupFile(id, this.configDir ?? resolveConfigDir());
    } catch {
      /* 配置缺失不阻断生命周期动作 */
    }
    const result = await this.exec(`systemctl ${action} ${unitFor(id)}`);
    const ok = result.code === 0;
    const status: TaskStatus = ok ? 'succeeded' : 'failed';
    await this.tasks.updateStatus(taskId, status);
    await this.audits.append({
      actor: by,
      action: `lifecycle:${action}`,
      target: id,
      result: ok ? 'succeeded' : (result.stderr || result.stdout).trim().slice(0, 200) || 'failed',
      ts: new Date(),
    });
  }
}
