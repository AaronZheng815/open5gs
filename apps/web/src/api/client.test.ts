import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { useAuthStore } from '../store/auth-store';

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.getState().clearAuth();
});

describe('T-13 API client', () => {
  it('login POST /api/login 解析共享 LoginResponse（accessToken/username/roles）', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ accessToken: 'tok', username: 'admin', roles: ['admin'] }),
            { status: 200 },
          ),
        ),
    );
    const resp = await api.login({ username: 'admin', password: 'pw' });
    expect(resp).toEqual({ accessToken: 'tok', username: 'admin', roles: ['admin'] });
    expect(fetch).toHaveBeenCalledWith('/api/login', expect.objectContaining({ method: 'POST' }));
  });

  it('带 token 的请求自动附上 Authorization: Bearer <token>', async () => {
    useAuthStore.getState().setAuth('jwt-x', 'ops', ['ops']);
    const spy = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await api.inventory();
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-x');
  });

  it('非 2xx 抛错（含后端 error body）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('用户名或口令错误', { status: 401 })),
    );
    await expect(api.login({ username: 'x', password: 'y' })).rejects.toThrow('用户名或口令错误');
  });
});
