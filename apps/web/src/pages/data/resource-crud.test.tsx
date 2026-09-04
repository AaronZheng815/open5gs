import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { ReactNode } from 'react';
import { ResourceCrud } from './resource-crud';
import { subscriberConfig } from './crud-configs';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
  api: {
    listSubscribers: vi.fn(),
    createSubscriber: vi.fn(),
    updateSubscriber: vi.fn(),
    deleteSubscriber: vi.fn(),
    listProfiles: vi.fn(),
    listAccounts: vi.fn(),
  },
}));

const mocks = api as unknown as {
  listSubscribers: ReturnType<typeof vi.fn>;
  createSubscriber: ReturnType<typeof vi.fn>;
  updateSubscriber: ReturnType<typeof vi.fn>;
  deleteSubscriber: ReturnType<typeof vi.fn>;
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <ConfigProvider locale={zhCN}>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  </ConfigProvider>
);

describe('T-18 ResourceCrud（Subscriber 记录级 CRUD）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSubscribers.mockResolvedValue([]);
  });

  it('列表渲染（列表/行数据），无需表单交互（AC-13 列表半段）', async () => {
    mocks.listSubscribers.mockResolvedValue([
      { imsi: '460111234560001', msisdn: ['8613800000001'], security: { k: 'AAAA', opc: 'BBBB' } },
      { imsi: '460111234560002', security: { k: 'CCCC' } },
    ]);
    render(<ResourceCrud config={subscriberConfig} />, { wrapper });
    expect(await screen.findByText('460111234560001')).toBeInTheDocument();
    expect(screen.getByText('460111234560002')).toBeInTheDocument();
    // msisdn 数组以逗号拼接
    expect(screen.getByText('8613800000001')).toBeInTheDocument();
    // 嵌套字段取出渲染
    expect(screen.getByText('AAAA')).toBeInTheDocument();
    expect(screen.getByText('BBBB')).toBeInTheDocument();
  });

  it('新建：填写 imsi + 鉴权 K → 调 create 且 body 含 imsi 与 security.k（AC-13 新建半段）', async () => {
    mocks.createSubscriber.mockResolvedValue({ imsi: '460111234560001', security: { k: 'AAAA' } });
    render(<ResourceCrud config={subscriberConfig} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: /新\s*建/ }));
    const imsiInput = await screen.findByLabelText('IMSI');
    fireEvent.change(imsiInput, { target: { value: '460111234560001' } });
    fireEvent.change(screen.getByLabelText('鉴权密钥 K'), { target: { value: 'AAAA' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(mocks.createSubscriber).toHaveBeenCalled());
    const [body] = mocks.createSubscriber.mock.calls.at(-1)!;
    expect(body.imsi).toBe('460111234560001');
    expect(body.security.k).toBe('AAAA');
  });

  it('编辑：预填原纪录，改 K 后调 update(id=imsi) 且保留未编辑字段', async () => {
    mocks.listSubscribers.mockResolvedValue([
      { imsi: '460111234560001', msisdn: ['8613800000001'], security: { k: 'OLD', opc: 'KEEP' } },
    ]);
    mocks.updateSubscriber.mockResolvedValue({ imsi: '460111234560001', security: { k: 'NEW' } });
    render(<ResourceCrud config={subscriberConfig} />, { wrapper });

    expect(await screen.findByText('460111234560001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    const kInput = await screen.findByLabelText('鉴权密钥 K');
    expect(kInput).toHaveValue('OLD'); // 预填
    fireEvent.change(kInput, { target: { value: 'NEW' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(mocks.updateSubscriber).toHaveBeenCalled());
    const [id, body] = mocks.updateSubscriber.mock.calls.at(-1)!;
    expect(id).toBe('460111234560001');
    expect(body.imsi).toBe('460111234560001'); // 未编辑字段保留
    expect(body.security.opc).toBe('KEEP'); // 嵌套兄弟字段保留
    expect(body.security.k).toBe('NEW');
  });

  it('删除：二次确认后调 delete(id=imsi)（AC-13 删除半段）', async () => {
    mocks.listSubscribers.mockResolvedValue([{ imsi: '460111234560001' }]);
    mocks.deleteSubscriber.mockResolvedValue(undefined);
    render(<ResourceCrud config={subscriberConfig} />, { wrapper });

    expect(await screen.findByText('460111234560001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
    fireEvent.click(await screen.findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(mocks.deleteSubscriber).toHaveBeenCalledWith('460111234560001'));
  });

  it('slice 为非法 JSON 时保存被拦截（校验）', async () => {
    render(<ResourceCrud config={subscriberConfig} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /新\s*建/ }));
    const imsiInput = await screen.findByLabelText('IMSI');
    fireEvent.change(imsiInput, { target: { value: '460111234560001' } });
    fireEvent.change(screen.getByLabelText('鉴权密钥 K'), { target: { value: 'AAAA' } });
    fireEvent.change(screen.getByLabelText('切片配置（Slice JSON）'), {
      target: { value: '{invalid json' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(screen.getByText('不是合法 JSON')).toBeInTheDocument());
    expect(mocks.createSubscriber).not.toHaveBeenCalled();
  });
});
