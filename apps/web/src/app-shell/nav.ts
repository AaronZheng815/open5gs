export interface NavItem {
  key: string;
  label: string;
  path: string;
}

/** 五大导航模块（SPEC/AC-10）。 */
export const NAV_ITEMS: NavItem[] = [
  { key: 'assets', label: '资产', path: '/assets' },
  { key: 'topology', label: '拓扑', path: '/topology' },
  { key: 'monitor', label: '监控', path: '/monitor' },
  { key: 'config', label: '配置', path: '/config' },
  { key: 'audit', label: '审计', path: '/audit' },
];
