import { exec } from 'node:child_process';
import type { LifecycleStatus } from '@open5gs/shared';

/** systemd 单元命名：open5gs-{nf}d，与 `open5gs-*.service` 对应（EV-006）。 */
export const UNIT_PREFIX = 'open5gs-';
export const UNIT_SUFFIX = 'd';

export function unitFor(id: string): string {
  return `${UNIT_PREFIX}${id}${UNIT_SUFFIX}`;
}

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** 执行命令并透传退出码/stdout/stderr（systemctl 非 0 退出不视为抛错）。 */
export function execCapture(cmd: string): Promise<ExecResult> {
  return new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      const code = error
        ? typeof (error as NodeJS.ErrnoException & { code?: number }).code === 'number'
          ? (error as unknown as { code: number }).code
          : 1
        : 0;
      resolve({ code, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

/** AC-6：返回与 `systemctl is-active <unit>` 输出一致的在线状态。 */
export async function statusOf(id: string, execFn: (cmd: string) => Promise<ExecResult> = execCapture): Promise<LifecycleStatus> {
  const { stdout } = await execFn(`systemctl is-active ${unitFor(id)}`);
  const s = stdout.trim();
  return s === 'active' || s === 'inactive' || s === 'failed' ? s : 'unknown';
}
