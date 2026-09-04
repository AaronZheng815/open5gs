import { Card, Typography } from 'antd';

export function MonitorPage() {
  return (
    <Card>
      <Typography.Title level={4}>监控</Typography.Title>
      <Typography.Text type="secondary">指标快照 / 趋势（T-17 实现）</Typography.Text>
    </Card>
  );
}
