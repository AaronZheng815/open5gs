import type { LoginRequest, LoginResponse, NfAssetList } from '@open5gs/shared';
import { useAuthStore } from '../store/auth-store';

const BASE = '/api';

/** 附登录 token 的请求头；无 token 时不带 Authorization。 */
function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 统一 fetch 包装：base=/api、JSON、带鉴权头、非 2xx 抛错（body 为错误详情）。 */
async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login(body: LoginRequest): Promise<LoginResponse> {
    return http<LoginResponse>('/login', { method: 'POST', body: JSON.stringify(body) });
  },
  inventory(): Promise<NfAssetList> {
    return http<NfAssetList>('/inventory');
  },
  nfs(): Promise<NfAssetList> {
    return http<NfAssetList>('/nfs');
  },
};
