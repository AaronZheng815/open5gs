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
};
