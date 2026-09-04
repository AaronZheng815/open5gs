import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { AuthRequest } from './auth.types';

function ctxFor(req: AuthRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext;
}

function reflectorReturning(required: string[]): Reflector {
  return { get: () => required } as unknown as Reflector;
}

describe('T-5 RolesGuard', () => {
  it('无角色要求 → 直接放行', () => {
    const guard = new RolesGuard(reflectorReturning([]));
    expect(guard.canActivate(ctxFor({ user: { username: 'u', roles: [] } }))).toBe(true);
  });

  it('角色 ∈ {dev,test,ops} 放行，否则 403', () => {
    const guard = new RolesGuard(reflectorReturning(['dev', 'test', 'ops']));
    expect(guard.canActivate(ctxFor({ user: { username: 'a', roles: ['dev'] } }))).toBe(true);
    const req = ctxFor({ user: { username: 'b', roles: ['admin'] } });
    expect(() => guard.canActivate(req)).toThrow(ForbiddenException);
  });

  it('缺 user（未鉴权）且要求角色 → 403', () => {
    const guard = new RolesGuard(reflectorReturning(['dev']));
    expect(() => guard.canActivate(ctxFor({}))).toThrow(ForbiddenException);
  });
});
