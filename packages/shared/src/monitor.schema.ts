import { z } from 'zod';

export const MetricSampleSchema = z.object({
  name: z.string(),
  value: z.number(),
  labels: z.record(z.string()).optional(),
});
export type MetricSample = z.infer<typeof MetricSampleSchema>;

export const MetricSnapshotSchema = z.object({
  nfId: z.string(),
  available: z.boolean(),
  metrics: z.array(MetricSampleSchema),
  info: z.record(z.unknown()).optional(),
});
export type MetricSnapshot = z.infer<typeof MetricSnapshotSchema>;
