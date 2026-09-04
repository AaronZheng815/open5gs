import { useMutation } from '@tanstack/react-query';
import type { LoginRequest } from '@open5gs/shared';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth-store';

/** 登录 mutation：调 /api/login，成功后写入 zonst（token/username/roles）。 */
export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (body: LoginRequest) => api.login(body),
    onSuccess: (resp) => setAuth(resp.accessToken, resp.username, resp.roles),
  });
}
