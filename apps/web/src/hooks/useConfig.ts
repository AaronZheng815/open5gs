import { useMutation, useQuery } from '@tanstack/react-query';
import type { ConfigDiff, ConfigDoc } from '@open5gs/shared';
import { api } from '../api/client';

/** 读取某网元结构化配置（AC-2）。id 存在时才请求。 */
export function useConfig(id: string) {
  return useQuery<ConfigDoc>({
    queryKey: ['config', id],
    queryFn: () => api.getConfig(id),
    enabled: Boolean(id),
  });
}

export interface ApplyConfigVars {
  id: string;
  content: Record<string, unknown>;
  dryRun: boolean;
}

/** 应用配置：dryRun=true 仅 diff 不落盘（AC-3）；false 落盘并返回 diff（AC-4）。 */
export function useApplyConfig() {
  return useMutation<ConfigDiff, Error, ApplyConfigVars>({
    mutationFn: ({ id, content, dryRun }) => api.applyConfig(id, content, dryRun),
  });
}
