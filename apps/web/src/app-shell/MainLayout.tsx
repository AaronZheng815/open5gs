import { Button, Layout, Menu, Space, Typography } from 'antd';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from './nav';
import { useAuthStore } from '../store/auth-store';

const { Sider, Header, Content } = Layout;

/** 登录后主框架：左侧五模块导航 + 顶部用户/退出 + 内容区（AC-10）。 */
export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const username = useAuthStore((s) => s.username);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // 未登录跳转登录页（路由守卫，简单实现）
  useEffect(() => {
    if (!useAuthStore.getState().token) navigate('/login', { replace: true });
  }, [navigate]);

  const selected = NAV_ITEMS.find((i) => location.pathname.startsWith(i.path))?.key ?? 'assets';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <Typography.Text strong style={{ color: '#fff', display: 'block', padding: 16 }}>
          NMS Console
        </Typography.Text>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          items={NAV_ITEMS.map((item) => ({
            key: item.key,
            label: (
              <a
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
              >
                {item.label}
              </a>
            ),
          }))}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingInline: 24,
          }}
        >
          <Typography.Text strong>网元管理控制台</Typography.Text>
          <Space>
            <span>{username}</span>
            <Button onClick={clearAuth}>退出</Button>
          </Space>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#f5f5f5', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
