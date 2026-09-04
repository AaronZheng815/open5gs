import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuditLogList,
  LifecycleAction,
  LifecycleStatus,
  LifecycleTaskList,
} from '@open5gs/shared';
import { api } from '../api/client';

/** 网元服务状态（= systemctl is-active，AC-6）。id 存在时才请求。 */
export function useLifecycleStatus(id: string) {
  return useQuery<LifecycleStatus>({
    queryKey: ['lifecycle', id],
    queryFn: () => api.lifecycleStatus(id),
    enabled: Boolean(id),
  });
}

export interface LifecycleActionVars {
  id: string;
  action: LifecycleAction;
}

/** 触发生命周期动作，返回 202 + 异步任务 id（AC-5）；成功后回读状态。 */
export function useLifecycleAction() {
  const qc = useQueryClient();
  return useMutation<{ taskId: string }, Error, LifecycleActionVars>({
    mutationFn: ({ id, action }) => api.lifecycleAction(id, action),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['lifecycle', id] });
    },
  });
}

/** 生命周期任务历史（AC-12）。 */
export function useLifecycleTasks(nfId: string) {
  return useQuery<LifecycleTaskList>({
    queryKey: ['lifecycle-tasks', nfId],
    queryFn: () => api.lifecycleTasks(nfId),
    enabled: Boolean(nfId),
  });
}

/** 审计日志列表（AC-12）。 */
export function useAudits() {
  return useQuery<AuditLogList>({
    queryKey: ['audits'],
    queryFn: () => api.audits(),
  });
}
