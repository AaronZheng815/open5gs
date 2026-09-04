import { Injectable, NotFoundException } from '@nestjs/common';
import { writeFileSync } from 'node:fs';
import type { ConfigDiff, ConfigDoc, ConfigPatch } from '@open5gs/shared';
import { KNOWN_NF_TYPES, resolveConfigDir } from '../asset/inventory.loader';
import { dumpYaml, isSafeId, readYaml } from './yaml.util';
import { diffConfig } from './diff.util';
import { backupFile } from './backup.util';

@Injectable()
export class ConfigService {
  /** AC-2：读取并结构化解析某网元配置。 */
  readConfig(id: string, configDir?: string): ConfigDoc {
    const doc = readYaml(id, configDir ?? resolveConfigDir());
    if (!doc || !this.isKnown(id)) throw new NotFoundException(`配置不存在：${id}`);
    return doc;
  }

  /** AC-3/AC-4：应用配置。dryRun=true 只返回 diff 不落盘；dryRun=false 先备份再写回并返回 diff。 */
  applyConfig(id: string, patch: ConfigPatch, dryRun: boolean, configDir?: string): ConfigDiff {
    const current = this.readConfig(id, configDir);
    const after = patch?.content ?? {};
    const diff = diffConfig(current.content, after);

    if (!dryRun && diff.length > 0) {
      const dir = configDir ?? resolveConfigDir();
      backupFile(id, dir); // AC-4 写前备份
      writeFileSync(current.path, dumpYaml(after), 'utf8');
    }
    return { id, dryRun, diff };
  }

  private isKnown(id: string): boolean {
    return isSafeId(id) && KNOWN_NF_TYPES.includes(id);
  }
}
