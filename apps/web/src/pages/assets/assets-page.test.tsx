import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssetsPage } from './assets-page';
import { useNfs } from '../../hooks/useNfs';

vi.mock('../../hooks/useNfs', () => ({ useNfs: vi.fn() }));

const data = {
  items: [
    { id: 'amf', nfType: 'amf', addr: '127.0.0.5', role: '接入与移动性管理', status: 'online' },
    {
      id: 'smf',
      nfType: 'smf',
      addr: '127.0.0.4',
      role: '会话管理',
      status: 'offline',
      expected: true,
    },
  ],
  total: 2,
};

describe('T-14 assets page', () => {
  it('渲染资产表格（类型/角色/地址/在线），差值标记显示', () => {
    (useNfs as ReturnType<typeof vi.fn>).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
      error: null,
    });
    render(<AssetsPage />);
    expect(screen.getByText('amf')).toBeInTheDocument();
    expect(screen.getByText('127.0.0.5')).toBeInTheDocument();
    expect(screen.getByText('接入与移动性管理')).toBeInTheDocument();
    // 差值标记：expected 的 smf 显示"预期缺失"标签
    expect(screen.getByText('预期缺失')).toBeInTheDocument();
  });

  it('NRF 不可达（isError）时显示平台告警而非白屏（AC-7）', () => {
    (useNfs as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('NRF 不可达：connect ECONNREFUSED 127.0.0.10:7777'),
    });
    render(<AssetsPage />);
    // Alert message 与 description 均含 'NRF 不可达'，取任一命中即可证明告警态而非白屏
    expect(screen.getAllByText(/NRF 不可达/).length).toBeGreaterThan(0);
  });
});
