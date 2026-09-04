import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useConfig, useApplyConfig } from './useConfig';
import { api } from '../api/client';

vi.mock('../api/client', () => ({ api: { getConfig: vi.fn(), applyConfig: vi.fn() } }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('T-15 useConfig', () => {
  it('useConfig 加载某网元结构化配置（AC-2）', async () => {
    (api.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'amf',
      path: '/cfg/amf.yaml',
      content: { amf: { mtu: 1400 } },
    });
    const { result } = renderHook(() => useConfig('amf'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.content).toEqual({ amf: { mtu: 1400 } });
  });

  it('useApplyConfig 以 dryRun 参数调用 applyConfig（AC-3/AC-4）', async () => {
    (api.applyConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'amf',
      dryRun: true,
      diff: [{ type: 'change', path: 'amf.mtu', before: 1400, after: 1500 }],
    });
    const { result } = renderHook(() => useApplyConfig(), { wrapper });
    result.current.mutate({ id: 'amf', content: { amf: { mtu: 1500 } }, dryRun: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.applyConfig).toHaveBeenCalledWith('amf', { amf: { mtu: 1500 } }, true);
    expect(result.current.data?.dryRun).toBe(true);
  });
});
