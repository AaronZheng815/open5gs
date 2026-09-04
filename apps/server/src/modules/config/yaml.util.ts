import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';
import type { ConfigDoc } from '@open5gs/shared';

/** id 只能是指定网元的 nfType（防路径穿越）。 */
const ID_RE = /^[A-Za-z0-9_-]+$/;

export interface LoadedYaml {
  path: string;
  content: Record<string, unknown>;
  raw: string;
}

/** 解析 <configDir>/<id>.yaml（或 .yaml.in 模板回退）。路径不存在时返回 null。 */
export function resolveConfigPath(id: string, configDir: string): string | null {
  if (!ID_RE.test(id)) return null;
  const yamlPath = join(configDir, `${id}.yaml`);
  if (existsSync(yamlPath)) return yamlPath;
  const inPath = join(configDir, `${id}.yaml.in`);
  if (existsSync(inPath)) return inPath;
  return null;
}

export function readYaml(id: string, configDir: string): ConfigDoc | null {
  const path = resolveConfigPath(id, configDir);
  if (!path) return null;
  const raw = readFileSync(path, 'utf8');
  const content = (yaml.load(raw) as Record<string, unknown> | null) ?? {};
  return { id, path, content, raw };
}

/** 由结构化对象生成 yaml 文本（决策 2.5：结构化字段编辑 → yaml 生成）。 */
export function dumpYaml(content: Record<string, unknown>): string {
  return yaml.dump(content, { noRefs: true, lineWidth: 120 });
}

/** 校验 id 是否安全（供 service 复用）。 */
export function isSafeId(id: string): boolean {
  return ID_RE.test(id);
}
