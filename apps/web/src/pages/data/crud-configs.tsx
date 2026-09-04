import type { ColumnsType } from 'antd/es/table';
import type { CrudConfig, CrudField } from './resource-crud';
import type { SubscriberRow, ProfileRow, AccountRow } from './rows';
import { api } from '../../api/client';
import { getPath } from './path-util';

const UNIT_OPTS = [
  { label: 'bps', value: 0 },
  { label: 'Kbps', value: 1 },
  { label: 'Mbps', value: 2 },
  { label: 'Gbps', value: 3 },
  { label: 'Tbps', value: 4 },
];

const STATUS_OPTS = [
  { label: 'SERVICE_GRANTED (0)', value: 0 },
  { label: 'OPERATOR_DETERMINED_BARRING (1)', value: 1 },
];

const BARRING_NUM_OPTS = [
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '7', value: 7 },
  { label: '8', value: 8 },
];

const sliceJsonField = (): CrudField => ({
  name: 'slice',
  label: '切片配置（Slice JSON）',
  type: 'json',
});

const ambrFields = (): CrudField[] => [
  { name: 'ambr.downlink.value', label: 'UE-AMBR 下行值', type: 'number' },
  { name: 'ambr.downlink.unit', label: '下行单位', type: 'select', options: UNIT_OPTS },
  { name: 'ambr.uplink.value', label: 'UE-AMBR 上行值', type: 'number' },
  { name: 'ambr.uplink.unit', label: '上行单位', type: 'select', options: UNIT_OPTS },
];

const securityFields = (): CrudField[] => [
  { name: 'security.k', label: '鉴权密钥 K', type: 'text', required: true },
  { name: 'security.opc', label: 'OPc', type: 'text' },
  { name: 'security.op', label: 'OP', type: 'text' },
  { name: 'security.amf', label: 'AMF', type: 'text' },
];

/* ------------------------------------------------------------------ */
/* Subscriber                                                           */
/* ------------------------------------------------------------------ */

const subscriberFields: CrudField[] = [
  { name: 'imsi', label: 'IMSI', type: 'text', required: true },
  { name: 'msisdn', label: 'MSISDN', type: 'tags' },
  ...securityFields(),
  ...ambrFields(),
  { name: 'subscriber_status', label: 'Subscriber Status', type: 'select', options: STATUS_OPTS },
  { name: 'operator_determined_barring', label: 'Operator Barring', type: 'select', options: BARRING_NUM_OPTS },
  { name: 'network_access_mode', label: 'Network Access Mode', type: 'select', options: BARRING_NUM_OPTS },
  sliceJsonField(),
];

const subscriberColumns: ColumnsType<SubscriberRow> = [
  { title: 'IMSI', dataIndex: 'imsi', key: 'imsi' },
  {
    title: 'MSISDN',
    dataIndex: 'msisdn',
    key: 'msisdn',
    render: (v: unknown) => (Array.isArray(v) ? (v as string[]).join(', ') : (v as string) ?? '-'),
  },
  { title: '鉴权 K', key: 'k', render: (_, r) => String(getPath(r, 'security.k') ?? '-') },
  { title: 'OPc', key: 'opc', render: (_, r) => String(getPath(r, 'security.opc') ?? '-') },
  {
    title: '状态',
    dataIndex: 'subscriber_status',
    key: 'status',
    render: (v: unknown) => (v === 1 ? 'BARRING' : 'GRANTED'),
  },
];

export const subscriberConfig: CrudConfig<SubscriberRow> = {
  key: 'subscriber',
  entity: 'Subscriber',
  idKey: 'imsi',
  columns: subscriberColumns,
  fields: subscriberFields,
  list: () => api.listSubscribers(),
  create: (body) => api.createSubscriber(body),
  update: (id, body) => api.updateSubscriber(id, body),
  remove: (id) => api.deleteSubscriber(id),
};

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

const profileFields: CrudField[] = [
  { name: 'title', label: 'Profile 标题', type: 'text', required: true },
  { name: 'msisdn', label: 'MSISDN', type: 'tags' },
  ...securityFields(),
  ...ambrFields(),
  { name: 'subscriber_status', label: 'Subscriber Status', type: 'select', options: STATUS_OPTS },
  { name: 'operator_determined_barring', label: 'Operator Barring', type: 'select', options: BARRING_NUM_OPTS },
  sliceJsonField(),
];

const profileColumns: ColumnsType<ProfileRow> = [
  { title: '标题', dataIndex: 'title', key: 'title' },
  {
    title: 'MSISDN',
    dataIndex: 'msisdn',
    key: 'msisdn',
    render: (v: unknown) => (Array.isArray(v) ? (v as string[]).join(', ') : (v as string) ?? '-'),
  },
  { title: '鉴权 K', key: 'k', render: (_, r) => String(getPath(r, 'security.k') ?? '-') },
  {
    title: '状态',
    dataIndex: 'subscriber_status',
    key: 'status',
    render: (v: unknown) => (v === 1 ? 'BARRING' : 'GRANTED'),
  },
];

export const profileConfig: CrudConfig<ProfileRow> = {
  key: 'profile',
  entity: 'Profile',
  idKey: 'title',
  columns: profileColumns,
  fields: profileFields,
  list: () => api.listProfiles(),
  create: (body) => api.createProfile(body),
  update: (id, body) => api.updateProfile(id, body),
  remove: (id) => api.deleteProfile(id),
};

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

const accountFields: CrudField[] = [
  { name: 'username', label: 'Username', type: 'text', required: true },
  {
    name: 'roles',
    label: '角色',
    type: 'multiselect',
    options: [
      { label: 'admin', value: 'admin' },
      { label: 'user', value: 'user' },
    ],
  },
];

const accountColumns: ColumnsType<AccountRow> = [
  { title: 'Username', dataIndex: 'username', key: 'username' },
  {
    title: '角色',
    dataIndex: 'roles',
    key: 'roles',
    render: (v: unknown) => ((v as string[]) ?? []).join(', ') || '-',
  },
];

export const accountConfig: CrudConfig<AccountRow> = {
  key: 'account',
  entity: 'Account',
  idKey: 'username',
  columns: accountColumns,
  fields: accountFields,
  list: () => api.listAccounts(),
  create: (body) => api.createAccount(body),
  update: (id, body) => api.updateAccount(id, body),
  remove: (id) => api.deleteAccount(id),
};
