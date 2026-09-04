import type {
  AuditLogList,
  ConfigDiff,
  ConfigDoc,
  LifecycleAction,
  LifecycleStatus,
  LifecycleTaskList,
  LoginRequest,
  LoginResponse,
  MetricSnapshot,
  NfAssetList,
} from '@open5gs/shared';
import type { TopologyGraph } from '@open5gs/shared';
import type { SubscriberRow, ProfileRow, AccountRow } from '../pages/data/rows';
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
  const text = await res.text();
  if (!text) return undefined as T; // 空 200（如 DELETE 返回 void）
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
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
  getConfig(id: string): Promise<ConfigDoc> {
    return http<ConfigDoc>(`/nfs/${id}/config`);
  },
  applyConfig(id: string, content: Record<string, unknown>, dryRun: boolean): Promise<ConfigDiff> {
    return http<ConfigDiff>(`/nfs/${id}/config${dryRun ? '?dry_run=true' : ''}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
  lifecycleStatus(id: string): Promise<LifecycleStatus> {
    return http<LifecycleStatus>(`/nfs/${id}/lifecycle`);
  },
  lifecycleAction(id: string, action: LifecycleAction): Promise<{ taskId: string }> {
    return http<{ taskId: string }>(`/nfs/${id}/lifecycle/${action}`, { method: 'POST' });
  },
  lifecycleTasks(nfId: string): Promise<LifecycleTaskList> {
    return http<LifecycleTaskList>(`/lifecycle-tasks?nfId=${encodeURIComponent(nfId)}`);
  },
  audits(): Promise<AuditLogList> {
    return http<AuditLogList>('/audits');
  },
  metricsSnapshot(nf: string): Promise<MetricSnapshot> {
    return http<MetricSnapshot>(`/metrics/${nf}/snapshot`);
  },
  topology(): Promise<TopologyGraph> {
    return http<TopologyGraph>('/topology');
  },
  listSubscribers(): Promise<SubscriberRow[]> {
    return http<SubscriberRow[]>('/subscribers');
  },
  createSubscriber(body: Record<string, unknown>): Promise<SubscriberRow> {
    return http<SubscriberRow>('/subscribers', { method: 'POST', body: JSON.stringify(body) });
  },
  updateSubscriber(imsi: string, body: Record<string, unknown>): Promise<SubscriberRow> {
    return http<SubscriberRow>(`/subscribers/${encodeURIComponent(imsi)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  deleteSubscriber(imsi: string): Promise<void> {
    return http<void>(`/subscribers/${encodeURIComponent(imsi)}`, { method: 'DELETE' });
  },
  listProfiles(): Promise<ProfileRow[]> {
    return http<ProfileRow[]>('/profiles');
  },
  createProfile(body: Record<string, unknown>): Promise<ProfileRow> {
    return http<ProfileRow>('/profiles', { method: 'POST', body: JSON.stringify(body) });
  },
  updateProfile(title: string, body: Record<string, unknown>): Promise<ProfileRow> {
    return http<ProfileRow>(`/profiles/${encodeURIComponent(title)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  deleteProfile(title: string): Promise<void> {
    return http<void>(`/profiles/${encodeURIComponent(title)}`, { method: 'DELETE' });
  },
  listAccounts(): Promise<AccountRow[]> {
    return http<AccountRow[]>('/accounts');
  },
  createAccount(body: Record<string, unknown>): Promise<AccountRow> {
    return http<AccountRow>('/accounts', { method: 'POST', body: JSON.stringify(body) });
  },
  updateAccount(username: string, body: Record<string, unknown>): Promise<AccountRow> {
    return http<AccountRow>(`/accounts/${encodeURIComponent(username)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  deleteAccount(username: string): Promise<void> {
    return http<void>(`/accounts/${encodeURIComponent(username)}`, { method: 'DELETE' });
  },
};
