import { useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPath, setPath, deepClone } from './path-util';

/** 数据驱动字段描述：点路径 name（如 security.k）+ 控件类型。 */
export type CrudFieldType = 'text' | 'number' | 'select' | 'multiselect' | 'tags' | 'json';

export interface CrudField {
  name: string;
  label: string;
  type: CrudFieldType;
  required?: boolean;
  options?: { label: string; value: string | number }[];
  help?: string;
}

/** 一个实体的记录级 CRUD 契约：列表/新建/编辑/删除 + 字段与列描述。 */
export interface CrudConfig<T extends Record<string, unknown>> {
  key: string;
  entity: string;
  idKey: keyof T & string;
  columns: ColumnsType<T>;
  fields: CrudField[];
  list: () => Promise<T[]>;
  create: (body: Record<string, unknown>) => Promise<T>;
  update: (id: string, body: Record<string, unknown>) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

/** 根据字段类型渲染对应 AntD 控件。必须原样返回单元素，Form.Item 才能注入 value/onChange/id。 */
function renderControl(field: CrudField) {
  switch (field.type) {
    case 'number':
      return <InputNumber style={{ width: '100%' }} />;
    case 'select':
      return <Select options={field.options} />;
    case 'multiselect':
      return <Select mode="multiple" options={field.options} />;
    case 'tags':
      return (
        <Select mode="tags" placeholder="可输入多个，回车/逗号分隔" tokenSeparators={[',', ' ']} />
      );
    case 'json':
      return <Input.TextArea rows={6} placeholder="JSON 数组或对象" />;
    default:
      return <Input placeholder={field.label} />;
  }
}

/** 记录 → 表单初值（嵌套字段按点路径展平；json 字段串行化为文本）。 */
function recordToValues<T extends Record<string, unknown>>(row: T, fields: CrudField[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const f of fields) {
    const v = getPath(row, f.name);
    if (v === undefined) continue;
    values[f.name] = f.type === 'json' ? JSON.stringify(v) : v;
  }
  return values;
}

/** 表单值 → 文档：在 base（编辑=原纪录、新建={}）上按点路径回写非空字段。 */
function valuesToDoc(
  base: Record<string, unknown>,
  values: Record<string, unknown>,
  fields: CrudField[],
): Record<string, unknown> {
  const doc = deepClone(base);
  for (const f of fields) {
    const v = values[f.name];
    if (v === undefined || v === null || v === '') continue;
    if (f.type === 'json') {
      setPath(doc, f.name, JSON.parse(v as string));
    } else {
      setPath(doc, f.name, v);
    }
  }
  return doc;
}

/** 通用记录级 CRUD 页 + 二次确认删除。供 Subscriber/Profile/Account 三页签复用（AC-13）。 */
export function ResourceCrud<T extends Record<string, unknown>>({ config }: { config: CrudConfig<T> }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form] = Form.useForm();

  const listQ = useQuery({ queryKey: ['crud', config.key], queryFn: config.list });

  const mut = useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: Record<string, unknown> }) =>
      id ? config.update(id, body) : config.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crud', config.key] });
      setOpen(false);
      setEditing(null);
      form.resetFields();
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => config.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crud', config.key] }),
  });

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    form.setFieldsValue(recordToValues(row, config.fields));
    setOpen(true);
  }

  async function onOk() {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return; // 校验不通过由 AntD 就地提示
    }
    const base = editing ? deepClone(editing) : {};
    const body = valuesToDoc(base, values, config.fields);
    mut.mutate({ id: editing ? String(editing[config.idKey]) : undefined, body });
  }

  const actions: ColumnsType<T> = [
    {
      title: '操作',
      key: '__actions',
      render: (_: unknown, row: T) => {
        const id = String(row[config.idKey]);
        return (
          <Space>
            <Button size="small" type="link" onClick={() => openEdit(row)}>
              编辑
            </Button>
            <Popconfirm
              title={`确认删除 ${config.entity} ${id}？`}
              onConfirm={() => del.mutate(id)}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {config.entity}
          </Typography.Title>
          <Button type="primary" onClick={openCreate}>
            新建
          </Button>
        </Space>
        <Table<T>
          rowKey={config.idKey}
          columns={[...config.columns, ...actions]}
          dataSource={listQ.data ?? []}
          loading={listQ.isLoading}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Space>
      <Modal
        open={open}
        title={editing ? `编辑 ${config.entity}` : `新建 ${config.entity}`}
        okText="保存"
        cancelText="取消"
        confirmLoading={mut.isPending}
        onOk={onOk}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          {config.fields.map((f) => (
            <Form.Item
              key={f.name}
              name={f.name}
              label={f.label}
              help={f.help}
              rules={
                f.type === 'json'
                  ? [
                      {
                        validator: (_: unknown, v: unknown) => {
                          if (v === undefined || v === '') return Promise.resolve();
                          try {
                            JSON.parse(v as string);
                            return Promise.resolve();
                          } catch {
                            return Promise.reject(new Error('不是合法 JSON'));
                          }
                        },
                      },
                    ]
                  : [{ required: f.required, message: `请填写 ${f.label}` }]
              }
            >
              {renderControl(f)}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </Card>
  );
}
