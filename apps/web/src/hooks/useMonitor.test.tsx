import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useMonitor } from './useMonitor';
import { useTopology } from './useTopology';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: { metricsSnapshot: vi.fn(), topology: vi.fn() },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('T-17 useMonitor / useTopology', () => {
  it('useMonitor 返回指标快照（available + metrics，AC-11）', async () => {
    (api.metricsSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      nfId: 'amf',
      available: true,
      metrics: [{ name: 'open5gs_amf_connections', value: 3 }],
    });
    const { result } = renderHook(() => useMonitor('amf'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.available).toBe(true);
    expect(result.current.data?.metrics[0].name).toBe('open5gs_amf_connections');
  });

  it('useMonitor Metrics 不可达时 available=false（降级，AC-11）', async () => {
    (api.metricsSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      nfId: 'amf',
      available: false,
      metrics: [],
    });
    const { result } = renderHook(() => useMonitor('amf'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.available).toBe(false);
  });

  it('useTopology 返回节点+边（AC-9）', async () => {
    (api.topology as ReturnType<typeof vi.fn>).mockResolvedValue({
      nodes: [{ id: 'amf', label: 'AMF', nfType: 'amf' }],
      edges: [{ source: 'amf', target: 'nrf' }],
    });
    const { result } = renderHook(() => useTopology(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.nodes).toHaveLength(1);
    expect(result.current.data?.edges).toHaveLength(1);
  });
});
