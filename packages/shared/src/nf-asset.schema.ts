import { z } from 'zod';

export const NfAssetStatusSchema = z.enum(['online', 'offline', 'unknown']);
export type NfAssetStatus = z.infer<typeof NfAssetStatusSchema>;

export const NfAssetSchema = z.object({
  id: z.string(),
  nfType: z.string(),
  instanceId: z.string().optional(),
  role: z.string().optional(),
  addr: z.string(),
  sbi: z.string().optional(),
  version: z.string().optional(),
  status: NfAssetStatusSchema,
  /** 差值标记：本地清单预期但 NRF 未注册的网元 */
  expected: z.boolean().optional(),
});
export type NfAsset = z.infer<typeof NfAssetSchema>;

export const NfAssetListSchema = z.object({
  items: z.array(NfAssetSchema),
  total: z.number().int().nonnegative(),
});
export type NfAssetList = z.infer<typeof NfAssetListSchema>;
