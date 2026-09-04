import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthRequest } from './auth.types';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>(ROLES_KEY, context.getHandler()) ?? [];
    if (required.length === 0) return true;
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const userRoles = (req.user?.roles ?? []) as string[];
    if (!required.some((role) => userRoles.includes(role))) {
      throw new ForbiddenException('角色权限不足');
    }
    return true;
  }
}
