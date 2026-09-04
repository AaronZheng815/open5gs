import type { Role } from '@open5gs/shared';

/** 解构 Fastify 请求（避免引入 fastify 直接依赖），仅暴露鉴权所需字段。 */
export interface AuthRequest {
  headers?: { authorization?: string };
  user?: AuthUser;
}

export interface AuthUser {
  username: string;
  roles: Role[];
}
