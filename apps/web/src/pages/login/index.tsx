import { Button, Card, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import type { LoginRequest } from '@open5gs/shared';

/** 登录页（AC-10 前置）：凭证 → /api/login → 成功写 zonst 并进入主框架。 */
export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();

  const onFinish = async (values: LoginRequest) => {
    try {
      await login.mutateAsync(values);
      navigate('/assets', { replace: true });
    } catch (err) {
      message.error(err instanceof Error ? err.message : '登录失败');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Card title="NMS Console 登录" style={{ width: 360 }}>
        <Form<LoginRequest> onFinish={onFinish} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={login.isPending}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
