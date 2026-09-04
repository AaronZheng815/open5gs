import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { ReactNode } from 'react';
import { DataPage } from './data-page';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
  api: {
    listSubscribers: vi.fn(),
    listProfiles: vi.fn(),
    listAccounts: vi.fn(),
    createSubscriber: vi.fn(),
    updateSubscriber: vi.fn(),
    deleteSubscriber: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <ConfigProvider locale={zhCN}>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  </ConfigProvider>
);

describe('T-18 DataPage（三页签）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.listSubscribers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { imsi: '460111234560001' },
    ]);
    (api.listProfiles as ReturnType<typeof vi.fn>).mockResolvedValue([{ title: 'default-profile' }]);
    (api.listAccounts as ReturnType<typeof vi.fn>).mockResolvedValue([{ username: 'admin', roles: ['admin'] }]);
  });

  it('渲染 Subscriber/Profile/Account 三页签，且各页签列表可达（AC-13 三页签）', async () => {
    render(<DataPage />, { wrapper });
    expect(screen.getByRole('tab', { name: 'Subscriber' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Account' })).toBeInTheDocument();
    // 默认激活 Subscriber：列表渲染
    expect(await screen.findByText('460111234560001')).toBeInTheDocument();
  });

  it('切到 Profile/Account 页签可查看各自列表', async () => {
    render(<DataPage />, { wrapper });
    expect(await screen.findByText('460111234560001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));
    expect(await screen.findByText('default-profile')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Account' }));
    await waitFor(() => expect(screen.getAllByText('admin').length).toBeGreaterThan(0));
  });
});
