import { Alert, Card, Space, Spin, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TopologyNode } from '@open5gs/shared';
import { useTopology } from '../../hooks/useTopology';
import { TopologyGraph } from './topology-graph';

const columns: ColumnsType<TopologyNode> = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: '类型', dataIndex: 'nfType', key: 'nfType' },
  { title: '标签', dataIndex: 'label', key: 'label' },
];

/** 拓扑页：AntV G6 渲染 /api/topology 的节点+边，无异常降级（AC-9）。 */
export function TopologyPage() {
  const { data, isLoading, isError, error } = useTopology();

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Typography.Title level={4} style={{ margin: 0 }}>
          网元拓扑
        </Typography.Title>

        {isError ? (
          <Alert
            type="error"
            showIcon
            message="平台告警：拓扑读取失败"
            description={String(error?.message ?? '')}
          />
        ) : isLoading ? (
          <Spin />
        ) : data ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <TopologyGraph data={data} />
            <Typography.Text type="secondary">
              节点 {data.nodes.length} 个 / 连线 {data.edges.length} 条
            </Typography.Text>
            <Table<TopologyNode>
              rowKey="id"
              columns={columns}
              dataSource={data.nodes}
              pagination={false}
              size="small"
            />
          </Space>
        ) : null}
      </Space>
    </Card>
  );
}
