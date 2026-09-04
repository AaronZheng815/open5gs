import { z } from 'zod';

export const AuditLogSchema = z.object({
  actor: z.string(),
  action: z.string(),
  target: z.string(),
  result: z.string(),
  ts: z.string().datetime(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
