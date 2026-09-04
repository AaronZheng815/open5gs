import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { MainLayout } from './MainLayout';
import { NAV_ITEMS } from './nav';
import { useAuthStore } from '../store/auth-store';

describe('T-13 app shell (五个导航模块)', () => {
  it('导航配置含五模块（资产/拓扑/监控/配置/审计）', () => {
    expect(NAV_ITEMS.map((i) => i.key)).toEqual([
      'assets',
      'topology',
      'monitor',
      'config',
      'audit',
    ]);
    expect(NAV_ITEMS).toHaveLength(5);
  });

  it('主框架渲染五个导航模块且无未捕获 JS 报错', () => {
    useAuthStore.getState().setAuth('jwt', 'admin', ['admin']); // 已登录态（AC-10）
    render(
      <MemoryRouter initialEntries={['/assets']}>
        <MainLayout />
      </MemoryRouter>,
    );
    for (const item of NAV_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
    // 登录用户名 Header 展示 + 退出入口（AntD 两汉字间自动插空格）
    expect(screen.getByRole('button', { name: /退\s*出/i })).toBeInTheDocument();
  });
});
