import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  useLifecycleStatus,
  useLifecycleAction,
  useLifecycleTasks,
  useAudits,
} from './useLifecycle';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    lifecycleStatus: vi.fn(),
    lifecycleAction: vi.fn(),
    lifecycleTasks: vi.fn(),
    audits: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('T-16 useLifecycle', () => {
  it('useLifecycleStatus 返回与 systemctl is-active 一致的状态（AC-6）', async () => {
    (api.lifecycleStatus as ReturnType<typeof vi.fn>).mockResolvedValue('active');
    const { result } = renderHook(() => useLifecycleStatus('amf'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe('active');
  });

  it('useLifecycleAction 以 {id, action} 触发并返回 taskId（AC-5）', async () => {
    (api.lifecycleAction as ReturnType<typeof vi.fn>).mockResolvedValue({ taskId: 'TASK123' });
    const { result } = renderHook(() => useLifecycleAction(), { wrapper });
    result.current.mutate({ id: 'amf', action: 'restart' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.lifecycleAction).toHaveBeenCalledWith('amf', 'restart');
    expect(result.current.data?.taskId).toBe('TASK123');
  });

  it('useLifecycleTasks / useAudits 返回列表（AC-12）', async () => {
    (api.lifecycleTasks as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{ id: 't1' as never }],
      total: 1,
    });
    (api.audits as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{ actor: 'admin' as never }],
      total: 1,
    });
    const { result: tasks } = renderHook(() => useLifecycleTasks('amf'), { wrapper });
    const { result: audits } = renderHook(() => useAudits(), { wrapper });
    await waitFor(() => expect(tasks.current.isSuccess).toBe(true));
    await waitFor(() => expect(audits.current.isSuccess).toBe(true));
    expect(tasks.current.data?.total).toBe(1);
    expect(audits.current.data?.total).toBe(1);
  });
});
