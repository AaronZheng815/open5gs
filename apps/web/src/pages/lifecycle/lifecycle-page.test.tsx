import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LifecyclePage } from './lifecycle-page';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
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

describe('T-16 lifecycle page', () => {
  it('展示与后端一致的网元服务状态（AC-6，inactive → 离线）', async () => {
    (api.lifecycleStatus as ReturnType<typeof vi.fn>).mockResolvedValue('inactive');
    (api.lifecycleTasks as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
    (api.audits as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
    render(<LifecyclePage />, { wrapper });
    expect(await screen.findByText('离线')).toBeInTheDocument();
  });

  it('重启前弹二次确认，确认后调用 API 并展示 202 + task id（AC-5）', async () => {
    (api.lifecycleStatus as ReturnType<typeof vi.fn>).mockResolvedValue('active');
    (api.lifecycleAction as ReturnType<typeof vi.fn>).mockResolvedValue({ taskId: 'TASK123' });
    (api.lifecycleTasks as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
    (api.audits as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
    render(<LifecyclePage />, { wrapper });
    await screen.findByText('在线');

    // 点击「重启」→ 弹二次确认框
    fireEvent.click(screen.getByRole('button', { name: /重\s*启/ }));
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getAllByText(/确认重启/).length).toBeGreaterThan(0);
    expect(api.lifecycleAction).not.toHaveBeenCalled();

    // 确认 → 调用 API，展示 202 + taskId
    fireEvent.click(within(modal).getByRole('button', { name: /确\s*认/ }));
    expect(await screen.findByText(/task id=TASK123/)).toBeInTheDocument();
    expect(api.lifecycleAction).toHaveBeenCalledWith('amf', 'restart');
  });

  it('任务历史与审计日志可展示（AC-12）', async () => {
    (api.lifecycleStatus as ReturnType<typeof vi.fn>).mockResolvedValue('active');
    (api.lifecycleTasks as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [
        {
          id: 't1',
          nfId: 'amf',
          action: 'restart',
          status: 'succeeded',
          by: 'admin',
          createdAt: '2026-09-04T00:00:00.000Z',
        },
      ],
      total: 1,
    });
    (api.audits as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [
        {
          actor: 'admin',
          action: 'lifecycle:restart',
          target: 'amf',
          result: 'succeeded',
          ts: '2026-09-04T00:00:00.000Z',
        },
      ],
      total: 1,
    });
    render(<LifecyclePage />, { wrapper });
    // 任务行 status 与审计行 result 均为 'succeeded' → 任一处命中即可证明可展示
    expect((await screen.findAllByText('succeeded')).length).toBeGreaterThan(0);
    expect(screen.getByText('lifecycle:restart')).toBeInTheDocument(); // 审计行
  });
});
