import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { LifecycleAction, LifecycleStatus } from '@open5gs/shared';
import { LifecycleTaskRepository } from '../../db/lifecycle-task.repository';
import { AuditLogRepository } from '../../db/audit-log.repository';
import { KNOWN_NF_TYPES } from '../asset/inventory.loader';
import { statusOf, execCapture, type ExecResult } from './status.util';
import { TaskQueue } from './task.queue';

export const LIFECYCLE_ACTIONS: LifecycleAction[] = ['start', 'stop', 'restart', 'reload'];

export interface LifecycleTaskRef {
  taskId: string;
}

@Injectable()
export class LifecycleService {
  private readonly queue: TaskQueue;
  private readonly exec: (cmd: string) => Promise<ExecResult>;

  constructor(
    private readonly tasks: LifecycleTaskRepository,
    private readonly audits: AuditLogRepository,
    @Optional() exec?: (cmd: string) => Promise<ExecResult>,
    @Optional() configDir?: string,
  ) {
    this.exec = exec ?? execCapture;
    this.queue = new TaskQueue(tasks, audits, this.exec, configDir);
  }

  /** AC-6：返回与 `systemctl is-active` 一致的网元服务状态。 */
  async statusOf(id: string): Promise<LifecycleStatus> {
    this.assertKnown(id);
    return statusOf(id, this.exec);
  }

  /** AC-5：触发 lifecycle 动作，返回 202 语义的异步任务 id。 */
  async execAction(id: string, action: string, by: string): Promise<LifecycleTaskRef> {
    this.assertKnown(id);
    if (!LIFECYCLE_ACTIONS.includes(action as LifecycleAction)) {
      throw new BadRequestException(`非法动作：${action}`);
    }
    const taskId = await this.queue.submit(id, action as LifecycleAction, by);
    return { taskId };
  }

  private assertKnown(id: string): void {
    if (!KNOWN_NF_TYPES.includes(id)) throw new NotFoundException(`未知网元：${id}`);
  }
}
