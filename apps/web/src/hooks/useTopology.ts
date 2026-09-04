import { useQuery } from '@tanstack/react-query';
import type { TopologyGraph } from '@open5gs/shared';
import { api } from '../api/client';

/** 网元拓扑图（节点+边，AC-9）。 */
export function useTopology() {
  return useQuery<TopologyGraph>({
    queryKey: ['topology'],
    queryFn: () => api.topology(),
  });
}
