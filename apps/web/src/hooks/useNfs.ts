import { useQuery } from '@tanstack/react-query';
import type { NfAssetList } from '@open5gs/shared';
import { api } from '../api/client';

/** 资产清单 query：GET /api/nfs。503（NRF 不可达）→ isError 供页面显示告警（AC-1/AC-7/AC-8）。 */
export function useNfs() {
  return useQuery<NfAssetList>({
    queryKey: ['nfs'],
    queryFn: () => api.nfs(),
  });
}
