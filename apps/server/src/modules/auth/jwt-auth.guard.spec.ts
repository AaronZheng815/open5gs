import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthRequest } from './auth.types';

function ctxFor(req: AuthRequest): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

describe('T-5 JwtAuthGuard', () => {
  const jwt = { verifyAsync: jest.fn() };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(jwt as unknown as JwtService);
  });

  it('有效 Bearer token → 挂载 req.user 并放行', async () => {
    jwt.verifyAsync.mockResolvedValue({ username: 'admin', roles: ['admin'] });
    const req: AuthRequest = { headers: { authorization: 'Bearer tok' } };
    await expect(guard.canActivate(ctxFor(req))).resolves.toBe(true);
    expect(req.user).toEqual({ username: 'admin', roles: ['admin'] });
  });

  it('缺失/非 Bearer token → 抛 401', async () => {
    const req: AuthRequest = { headers: {} };
    await expect(guard.canActivate(ctxFor(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('无效 token（verify 拒绝）→ 抛 401', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('bad'));
    const req: AuthRequest = { headers: { authorization: 'Bearer bad' } };
    await expect(guard.canActivate(ctxFor(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
