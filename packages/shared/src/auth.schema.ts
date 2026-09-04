import { z } from 'zod';

export const RoleSchema = z.enum(['dev', 'test', 'ops', 'admin']);
export type Role = z.infer<typeof RoleSchema>;

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  username: z.string(),
  roles: z.array(RoleSchema),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
