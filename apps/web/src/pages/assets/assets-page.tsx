import { Alert, Card, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { NfAsset } from '@open5gs/shared';
import { useNfs } from '../../hooks/useNfs';

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  online: { color: 'success', text: '在线' },
  offline: { color: 'default', text: '离线' },
  unknown: { color: 'warning', text: '未知' },
};

const columns: ColumnsType<NfAsset> = [
  { title: '类型', dataIndex: 'nfType', key: 'nfType' },
  { title: '角色', dataIndex: 'role', key: 'role' },
  { title: '地址', dataIndex: 'addr', key: 'addr' },
  {
    title: '在线',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      const meta = STATUS_TAG[status] ?? { color: 'default', text: status };
      return <Tag color={meta.color}>{meta.text}</Tag>;
    },
  },
  { title: '版本', dataIndex: 'version', key: 'version', render: (v?: string) => v ?? '-' },
  {
    title: '差值标记',
    key: 'expected',
    render: (_, asset) => (asset.expected ? <Tag color="orange">预期缺失</Tag> : null),
  },
];

/** 资产页：网元资产表格 + 在线状态 + 差值标记；NRF 不可达时显示告警而非白屏（AC-1/AC-7/AC-8）。 */
export function AssetsPage() {
  const { data, isLoading, isError, error } = useNfs();

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="平台告警：NRF 不可达"
        description={error instanceof Error ? error.message : '未能加载资产清单'}
      />
    );
  }

  return (
    <Card>
      <Typography.Title level={4}>网元资产</Typography.Title>
      <Table<NfAsset>
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={false}
        size="small"
      />
    </Card>
  );
}
