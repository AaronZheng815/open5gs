import { z } from 'zod';

/** 结构化配置文档（yaml → JSON 解析结果） */
export const ConfigDocSchema = z.object({
  id: z.string(),
  path: z.string(),
  content: z.record(z.unknown()),
  raw: z.string().optional(),
});
export type ConfigDoc = z.infer<typeof ConfigDocSchema>;

export const ConfigPatchSchema = z.object({
  content: z.record(z.unknown()),
});
export type ConfigPatch = z.infer<typeof ConfigPatchSchema>;

export const DiffLineSchema = z.object({
  type: z.enum(['add', 'remove', 'change']),
  path: z.string(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
});
export type DiffLine = z.infer<typeof DiffLineSchema>;

export const ConfigDiffSchema = z.object({
  id: z.string(),
  dryRun: z.boolean(),
  diff: z.array(DiffLineSchema),
});
export type ConfigDiff = z.infer<typeof ConfigDiffSchema>;
