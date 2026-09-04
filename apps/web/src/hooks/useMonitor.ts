import { useQuery } from '@tanstack/react-query';
import type { MetricSnapshot } from '@open5gs/shared';
import { api } from '../api/client';

/** 网元 :9090/metrics 快照（AC-11）。nf 存在时才请求。 */
export function useMonitor(nf: string) {
  return useQuery<MetricSnapshot>({
    queryKey: ['metrics', nf],
    queryFn: () => api.metricsSnapshot(nf),
    enabled: Boolean(nf),
  });
}
