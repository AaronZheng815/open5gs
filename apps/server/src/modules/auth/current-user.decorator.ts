import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthRequest, AuthUser } from './auth.types';

/** 取出经 JwtAuthGuard 挂载的当前用户（username/roles）。 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  return context.switchToHttp().getRequest<AuthRequest>().user as AuthUser;
});
