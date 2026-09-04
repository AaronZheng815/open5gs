import { Card, Typography } from 'antd';

export function ConfigPage() {
  return (
    <Card>
      <Typography.Title level={4}>配置</Typography.Title>
      <Typography.Text type="secondary">网元配置查看/编辑/diff（T-15 实现）</Typography.Text>
    </Card>
  );
}
