import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TopologyPage } from './topology-page';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({ api: { topology: vi.fn() } }));
vi.mock('./topology-graph', () => ({ TopologyGraph: () => <div data-testid="topology-graph" /> }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('T-17 topology page', () => {
  it('渲染 /api/topology 的节点与边，无渲染异常（AC-9）', async () => {
    (api.topology as ReturnType<typeof vi.fn>).mockResolvedValue({
      nodes: [
        { id: 'amf', label: '接入与移动性管理', nfType: 'amf' },
        { id: 'smf', label: '会话管理', nfType: 'smf' },
      ],
      edges: [{ source: 'amf', target: 'nrf', label: 'N8' }],
    });
    render(<TopologyPage />, { wrapper });
    expect(await screen.findByTestId('topology-graph')).toBeInTheDocument();
    expect(screen.getByText('节点 2 个 / 连线 1 条')).toBeInTheDocument();
    // 节点表渲染（类型/标签）
    expect(screen.getByText('接入与移动性管理')).toBeInTheDocument();
    expect(screen.getByText('会话管理')).toBeInTheDocument();
  });
});
