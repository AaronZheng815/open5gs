import { Tabs, Typography } from 'antd';
import { ResourceCrud } from './resource-crud';
import { subscriberConfig, profileConfig, accountConfig } from './crud-configs';

/**
 * 签约数据页（AC-13 前端半段）：三个页签 Subscriber / Profile / Account，
 * 各自为记录级 CRUD（列表/新建/编辑/删除）。路由 /data 可达（AC-10 五类导航保持不变）。
 */
export function DataPage() {
  return (
    <div>
      <Typography.Title level={4}>签约数据</Typography.Title>
      <Tabs
        defaultActiveKey="subscriber"
        items={[
          { key: 'subscriber', label: 'Subscriber', children: <ResourceCrud config={subscriberConfig} /> },
          { key: 'profile', label: 'Profile', children: <ResourceCrud config={profileConfig} /> },
          { key: 'account', label: 'Account', children: <ResourceCrud config={accountConfig} /> },
        ]}
      />
    </div>
  );
}
