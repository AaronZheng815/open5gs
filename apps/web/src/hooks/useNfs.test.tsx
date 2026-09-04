import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useNfs } from './useNfs';
import { api } from '../api/client';

vi.mock('../api/client', () => ({ api: { nfs: vi.fn() } }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('T-14 useNfs', () => {
  it('成功返回资产列表（items/total）', async () => {
    (api.nfs as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [
        { id: 'amf', nfType: 'amf', addr: '127.0.0.5', role: '接入与移动性管理', status: 'online' },
      ],
      total: 1,
    });
    const { result } = renderHook(() => useNfs(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].id).toBe('amf');
  });

  it('NRF 不可达（503）时进入 isError，供页面显示告警而非白屏', async () => {
    (api.nfs as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('NRF 不可达：connect ECONNREFUSED 127.0.0.10:7777'),
    );
    const { result } = renderHook(() => useNfs(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('NRF 不可达');
  });
});
