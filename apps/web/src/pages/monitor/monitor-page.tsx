import { useState } from 'react';
import { Alert, Card, Empty, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MetricSample } from '@open5gs/shared';
import { NF_IDS } from '../../shared/nf-list';
import { useMonitor } from '../../hooks/useMonitor';
import { MetricsChart } from './metrics-chart';

const columns: ColumnsType<MetricSample> = [
  { title: '指标', dataIndex: 'name', key: 'name' },
  { title: '值', dataIndex: 'value', key: 'value', width: 120 },
];

/** 监控页：ECharts 展示 :9090/metrics 快照；不可用时降级「无指标」（AC-11）。 */
export function MonitorPage() {
  const [nf, setNf] = useState('amf');
  const { data, isLoading, isError, error } = useMonitor(nf);
  const available = data?.available ?? false;

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space align="center">
          <Typography.Title level={4} style={{ margin: 0 }}>
            指标监控
          </Typography.Title>
          <Select
            aria-label="选择网元"
            style={{ width: 160 }}
            value={nf}
            onChange={setNf}
            options={NF_IDS.map((n) => ({ label: n.toUpperCase(), value: n }))}
          />
        </Space>

        {isError ? (
          <Alert
            type="error"
            showIcon
            message="平台告警：指标读取失败"
            description={String(error?.message ?? '')}
          />
        ) : isLoading ? (
          <Typography.Text type="secondary">加载 {nf.toUpperCase()} 指标中…</Typography.Text>
        ) : available && data && data.metrics.length > 0 ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <MetricsChart metrics={data.metrics} />
            <Typography.Text type="secondary">
              指标总数：{data.metrics.length}（来源 :9090/metrics）
            </Typography.Text>
            <Table<MetricSample>
              rowKey={(m, i) => `${m.name}-${i}`}
              columns={columns}
              dataSource={data.metrics}
              pagination={false}
              size="small"
            />
          </Space>
        ) : (
          <Empty description="无指标（Metrics 端点未开启或不可达，已降级）" />
        )}
      </Space>
    </Card>
  );
}
