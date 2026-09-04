import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MonitorPage } from './monitor-page';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({ api: { metricsSnapshot: vi.fn() } }));
vi.mock('./metrics-chart', () => ({ MetricsChart: () => <div data-testid="metrics-chart" /> }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('T-17 monitor page', () => {
  it('指标可用时渲染快照（chart + 指标表）而非无指标提示（AC-11）', async () => {
    (api.metricsSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      nfId: 'amf',
      available: true,
      metrics: [
        { name: 'open5gs_amf_connections', value: 3 },
        { name: 'open5gs_amf_registered_ues', value: 2 },
      ],
    });
    render(<MonitorPage />, { wrapper });
    expect(await screen.findByTestId('metrics-chart')).toBeInTheDocument();
    expect(screen.getByText('open5gs_amf_connections')).toBeInTheDocument();
    expect(screen.getByText(/指标总数：2/)).toBeInTheDocument();
    expect(screen.queryByText(/无指标/)).not.toBeInTheDocument();
  });

  it('指标不可用时降级「无指标」且不渲染 chart（AC-11 判定②）', async () => {
    (api.metricsSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      nfId: 'amf',
      available: false,
      metrics: [],
    });
    render(<MonitorPage />, { wrapper });
    expect(await screen.findByText(/无指标/)).toBeInTheDocument();
    expect(screen.queryByTestId('metrics-chart')).not.toBeInTheDocument();
  });
});
