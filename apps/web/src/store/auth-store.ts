import { create } from 'zustand';
import type { Role } from '@open5gs/shared';

const STORAGE_KEY = 'nms.auth';

interface AuthState {
  token: string | null;
  username: string | null;
  roles: Role[];
  setAuth: (token: string, username: string, roles: Role[]) => void;
  clearAuth: () => void;
}

/** 从 localStorage 恢复会话（刷新后保持登录态）。 */
function readPersisted(): Pick<AuthState, 'token' | 'username' | 'roles'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, username: null, roles: [] };
    const parsed = JSON.parse(raw) as Partial<Pick<AuthState, 'token' | 'username' | 'roles'>>;
    return {
      token: parsed.token ?? null,
      username: parsed.username ?? null,
      roles: parsed.roles ?? [],
    };
  } catch {
    return { token: null, username: null, roles: [] };
  }
}

/** 登录态（客户端状态）：token/username/roles，供 API client 与路由守卫读取。 */
export const useAuthStore = create<AuthState>((set) => ({
  ...readPersisted(),
  setAuth: (token, username, roles) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, username, roles }));
    set({ token, username, roles });
  },
  clearAuth: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, username: null, roles: [] });
  },
}));
