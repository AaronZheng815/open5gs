import { z } from 'zod';

export const LifecycleActionSchema = z.enum(['start', 'stop', 'restart', 'reload']);
export type LifecycleAction = z.infer<typeof LifecycleActionSchema>;

export const LifecycleStatusSchema = z.enum(['active', 'inactive', 'failed', 'unknown']);
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;

export const TaskStatusSchema = z.enum(['queued', 'running', 'succeeded', 'failed', 'rolled_back']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const LifecycleTaskSchema = z.object({
  id: z.string(),
  nfId: z.string(),
  action: LifecycleActionSchema,
  status: TaskStatusSchema,
  by: z.string(),
  createdAt: z.string().datetime(),
});
export type LifecycleTask = z.infer<typeof LifecycleTaskSchema>;

export const LifecycleTaskListSchema = z.object({
  items: z.array(LifecycleTaskSchema),
  total: z.number().int().nonnegative(),
});
export type LifecycleTaskList = z.infer<typeof LifecycleTaskListSchema>;
