import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolveConfigPath } from './yaml.util';

/** 备份目录：<configDir 父级>/config-backup，可用 OGS_BACKUP_DIR 覆盖。 */
export function backupDir(configDir: string, override?: string): string {
  return override ?? join(dirname(configDir), 'config-backup');
}

/**
 * 写前备份：把 <configDir>/<id>.yaml 复制到 backupDir/<id>-<时间戳>.yaml。
 * 返回备份文件路径（AC-4：写前生成时间戳备份）。
 */
export function backupFile(id: string, configDir: string, backupDirOverride?: string): string {
  const src = resolveConfigPath(id, configDir);
  if (!src) throw new Error(`配置文件不存在：${id}`);
  const dir = backupDir(configDir, backupDirOverride);
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(dir, `${id}-${ts}.yaml`);
  copyFileSync(src, dest);
  return dest;
}
