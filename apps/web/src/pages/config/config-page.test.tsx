import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ConfigPage } from './config-page';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
  api: { getConfig: vi.fn(), applyConfig: vi.fn() },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const DOC = {
  id: 'amf',
  path: '/cfg/amf.yaml',
  raw: 'amf: {}',
  content: {
    amf: { sbi: { server: [{ address: '127.0.0.5', port: 7777 }] }, mtu: 1400 },
  },
};

/** applyConfig 原样透传 dryRun 并返回一条 change diff。 */
function mockApply() {
  (api.applyConfig as ReturnType<typeof vi.fn>).mockImplementation(
    (id: string, content: Record<string, unknown>, dryRun: boolean) => {
      const amf = content.amf as Record<string, unknown>;
      const sbi = amf.sbi as Record<string, unknown>;
      const server = sbi.server as Array<Record<string, unknown>>;
      return Promise.resolve({
        id,
        dryRun,
        diff: [
          {
            type: 'change',
            path: 'amf.sbi.server[0].address',
            before: '127.0.0.5',
            after: server[0].address,
          },
        ],
      });
    },
  );
}

describe('T-15 config page', () => {
  it('加载某网元配置并结构化展示字段（AC-2）', async () => {
    (api.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(DOC);
    render(<ConfigPage />, { wrapper });
    // 结构化叶子字段路径作为 label 展示，且值正确
    expect(await screen.findByLabelText('amf.sbi.server[0].address')).toHaveValue('127.0.0.5');
    expect(screen.getByLabelText('amf.mtu')).toHaveValue('1400');
  });

  it('dry-run 展示 diff 且不落盘（AC-3）', async () => {
    (api.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(DOC);
    mockApply();
    render(<ConfigPage />, { wrapper });
    const address = await screen.findByLabelText('amf.sbi.server[0].address');
    fireEvent.change(address, { target: { value: '127.0.0.9' } });
    fireEvent.click(screen.getByRole('button', { name: /dry-run/ }));
    await screen.findByText(/未落盘/);
    expect(api.applyConfig).toHaveBeenCalledWith(
      'amf',
      expect.objectContaining({
        amf: expect.objectContaining({
          sbi: expect.objectContaining({ server: [{ address: '127.0.0.9', port: 7777 }] }),
        }),
      }),
      true,
    );
    // diff 展示前值 → 后值
    expect(screen.getByText(/127\.0\.0\.5 .*127\.0\.0\.9/)).toBeInTheDocument();
    // 落盘前仅调用一次（dry_run=true），未触发写盘
    expect(api.applyConfig).toHaveBeenCalledTimes(1);
  });

  it('确认落盘调用 dryRun=false 并展示成功 + diff（AC-4）', async () => {
    (api.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(DOC);
    mockApply();
    render(<ConfigPage />, { wrapper });
    const address = await screen.findByLabelText('amf.sbi.server[0].address');
    fireEvent.change(address, { target: { value: '127.0.0.9' } });
    // 先 dry-run（启用确认按钮），再确认落盘
    fireEvent.click(screen.getByRole('button', { name: /dry-run/ }));
    await screen.findByText(/未落盘/);
    fireEvent.click(screen.getByRole('button', { name: /确认\s*落盘/ }));
    await screen.findByText(/已落盘/);
    expect(api.applyConfig).toHaveBeenLastCalledWith('amf', expect.any(Object), false);
    expect(screen.getByText(/127\.0\.0\.5 .*127\.0\.0\.9/)).toBeInTheDocument();
  });
});
