import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { ConfigDiff, DiffLine } from '@open5gs/shared';
import { NF_IDS } from '../../shared/nf-list';
import { useApplyConfig, useConfig } from '../../hooks/useConfig';
import { flattenConfig, rebuildContent } from './config-fields';

const TYPE_META: Record<DiffLine['type'], { color: string; text: string }> = {
  change: { color: 'gold', text: '修改' },
  add: { color: 'green', text: '新增' },
  remove: { color: 'red', text: '删除' },
};

function fmt(v: unknown): string {
  if (v === undefined || v === null) return '∅';
  return typeof v === 'string' ? v : JSON.stringify(v);
}

/** diff 展示：change/add/remove 标签 + 路径 + 前值→后值。 */
function DiffList({ lines }: { lines: DiffLine[] }) {
  if (lines.length === 0)
    return <Typography.Text type="secondary">无差异（配置未变更）</Typography.Text>;
  return (
    <ul style={{ paddingLeft: 16, margin: 0 }}>
      {lines.map((l, i) => {
        const meta = TYPE_META[l.type];
        return (
          <li key={`${l.path}-${i}`} style={{ marginBottom: 4 }}>
            <Tag color={meta.color}>{meta.text}</Tag>
            <Typography.Text code>{l.path}</Typography.Text>{' '}
            <Typography.Text>
              {fmt(l.before)} <span style={{ color: '#8c8c8c' }}>→</span> {fmt(l.after)}
            </Typography.Text>
          </li>
        );
      })}
    </ul>
  );
}

/** 配置页：选网元 → 结构化展示/编辑 → dry-run 预览 diff（未落盘）→ 确认落盘。AC-2/AC-3/AC-4。 */
export function ConfigPage() {
  const [id, setId] = useState('amf');
  const { data, isLoading, isError, error } = useConfig(id);
  const apply = useApplyConfig();
  const [form] = Form.useForm();

  const initial = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(flattenConfig(data.content).map((f) => [f.path, f.value]));
  }, [data]);

  async function submit(dryRun: boolean) {
    if (!data) return;
    const values = await form.validateFields();
    const content = rebuildContent(data.content, values);
    apply.mutate({ id, content, dryRun });
  }

  const diff = apply.data as ConfigDiff | undefined;

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space align="center">
          <Typography.Title level={4} style={{ margin: 0 }}>
            网元配置
          </Typography.Title>
          <Select
            aria-label="选择网元"
            style={{ width: 160 }}
            value={id}
            onChange={setId}
            options={NF_IDS.map((n) => ({ label: n.toUpperCase(), value: n }))}
          />
        </Space>

        {isError ? (
          <Alert
            type="error"
            showIcon
            message="平台告警：配置读取失败"
            description={String(error?.message ?? '')}
          />
        ) : apply.isError ? (
          <Alert
            type="error"
            showIcon
            message="配置应用失败"
            description={String(apply.error?.message ?? '')}
          />
        ) : null}

        {isLoading || !data ? (
          <Typography.Text type="secondary">加载 {id.toUpperCase()} 配置中…</Typography.Text>
        ) : (
          <Form
            form={form}
            key={id}
            layout="vertical"
            initialValues={initial}
            disabled={apply.isPending}
          >
            {flattenConfig(data.content).map((f) => (
              <Form.Item key={f.path} name={f.path} label={f.path}>
                {typeof f.value === 'number' ? (
                  <InputNumber style={{ width: 240 }} />
                ) : (
                  <Input style={{ width: 240 }} />
                )}
              </Form.Item>
            ))}
          </Form>
        )}

        <Space>
          <Button type="primary" loading={apply.isPending} onClick={() => submit(true)}>
            dry-run 预览
          </Button>
          <Button loading={apply.isPending} onClick={() => submit(false)} disabled={!diff}>
            确认落盘
          </Button>
        </Space>

        {diff ? (
          <Alert
            type={diff.dryRun ? 'info' : 'success'}
            showIcon
            message={
              diff.dryRun
                ? 'dry-run 预览：仅展示变更，未落盘'
                : '已落盘：配置已写入目标文件（写前已备份）'
            }
            description={<DiffList lines={diff.diff} />}
          />
        ) : null}
      </Space>
    </Card>
  );
}
