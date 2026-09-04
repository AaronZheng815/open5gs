import { useState } from 'react';
import { Alert, Button, Card, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AuditLog, LifecycleAction, LifecycleTask } from '@open5gs/shared';
import { NF_IDS } from '../../shared/nf-list';
import {
  useAudits,
  useLifecycleAction,
  useLifecycleStatus,
  useLifecycleTasks,
} from '../../hooks/useLifecycle';

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  active: { color: 'success', text: '在线' },
  inactive: { color: 'default', text: '离线' },
  failed: { color: 'error', text: '失败' },
  unknown: { color: 'warning', text: '未知' },
};

const ACTIONS: Array<{ action: LifecycleAction; label: string; danger?: boolean }> = [
  { action: 'start', label: '启动' },
  { action: 'stop', label: '停止', danger: true },
  { action: 'restart', label: '重启', danger: true },
  { action: 'reload', label: '重载' },
];

const taskColumns: ColumnsType<LifecycleTask> = [
  { title: '网元', dataIndex: 'nfId', key: 'nfId' },
  { title: '动作', dataIndex: 'action', key: 'action' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '发起人', dataIndex: 'by', key: 'by' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
];

const auditColumns: ColumnsType<AuditLog> = [
  { title: '操作人', dataIndex: 'actor', key: 'actor' },
  { title: '动作', dataIndex: 'action', key: 'action' },
  { title: '目标', dataIndex: 'target', key: 'target' },
  { title: '结果', dataIndex: 'result', key: 'result' },
  { title: '时间', dataIndex: 'ts', key: 'ts' },
];

/** 生命周期页：状态展示（AC-6）+ 启停/重启/重载（二次确认，AC-5）+ 任务历史/审计（AC-12）。 */
export function LifecyclePage() {
  const [id, setId] = useState('amf');
  const status = useLifecycleStatus(id);
  const action = useLifecycleAction();
  const tasks = useLifecycleTasks(id);
  const audits = useAudits();

  function confirmAction(a: LifecycleAction, label: string, danger?: boolean) {
    Modal.confirm({
      title: `确认${label}`,
      content: `对 ${id.toUpperCase()} 执行「${label}」？`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger },
      onOk: () => action.mutate({ id, action: a }),
    });
  }

  const statusMeta = STATUS_TAG[status.data ?? 'unknown'] ?? STATUS_TAG.unknown;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card>
        <Space align="center">
          <Typography.Title level={4} style={{ margin: 0 }}>
            网元生命周期
          </Typography.Title>
          <Select
            aria-label="选择网元"
            style={{ width: 160 }}
            value={id}
            onChange={setId}
            options={NF_IDS.map((n) => ({ label: n.toUpperCase(), value: n }))}
          />
        </Space>
        <Space style={{ marginTop: 8 }}>
          <Tag color={statusMeta.color}>{statusMeta.text}</Tag>
          {ACTIONS.map((a) => (
            <Button
              key={a.action}
              danger={a.danger}
              loading={action.isPending}
              onClick={() => confirmAction(a.action, a.label, a.danger)}
            >
              {a.label}
            </Button>
          ))}
        </Space>
        {action.data ? (
          <Alert
            type="success"
            showIcon
            message={`已提交：任务已入队（task id=${action.data.taskId}）`}
            style={{ marginTop: 8 }}
          />
        ) : null}
        {action.isError ? (
          <Alert
            type="error"
            showIcon
            message="操作失败"
            description={String(action.error?.message ?? '')}
            style={{ marginTop: 8 }}
          />
        ) : null}
      </Card>

      <Card title="任务历史">
        <Table<LifecycleTask>
          rowKey="id"
          columns={taskColumns}
          dataSource={tasks.data?.items ?? []}
          loading={tasks.isLoading}
          pagination={false}
          size="small"
        />
      </Card>

      <Card title="审计日志">
        <Table<AuditLog>
          rowKey={(r, i) => `${r.actor}-${r.ts}-${i}`}
          columns={auditColumns}
          dataSource={audits.data?.items ?? []}
          loading={audits.isLoading}
          pagination={false}
          size="small"
        />
      </Card>
    </Space>
  );
}
