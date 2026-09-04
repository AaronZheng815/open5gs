import { describe, expect, it } from 'vitest';
import { flattenConfig, parsePath, rebuildContent } from './config-fields';

const CONTENT = {
  amf: {
    sbi: {
      server: [{ address: '127.0.0.5', port: 7777 }],
    },
    mtu: 1400,
  },
};

describe('T-15 config-fields', () => {
  it('flattenConfig 把嵌套 content 展平为叶子路径', () => {
    const flat = flattenConfig(CONTENT);
    expect(flat).toContainEqual({ path: 'amf.sbi.server[0].address', value: '127.0.0.5' });
    expect(flat).toContainEqual({ path: 'amf.sbi.server[0].port', value: 7777 });
    expect(flat).toContainEqual({ path: 'amf.mtu', value: 1400 });
    expect(flat).toHaveLength(3);
  });

  it('parsePath 解析点分 + 数组下标', () => {
    expect(parsePath('amf.sbi.server[0].address')).toEqual(['amf', 'sbi', 'server', 0, 'address']);
    expect(parsePath('amf.mtu')).toEqual(['amf', 'mtu']);
  });

  it('rebuildContent 回填编辑过的叶子，未编辑分支保持不变', () => {
    const edited = rebuildContent(CONTENT, {
      'amf.sbi.server[0].address': '127.0.0.9',
      'amf.mtu': 1500,
    });
    const amf = edited.amf as Record<string, unknown>;
    const sbi = amf.sbi as Record<string, unknown>;
    const server = sbi.server as Array<Record<string, unknown>>;
    expect(server[0].address).toBe('127.0.0.9');
    expect(server[0].port).toBe(7777); // 未编辑分支保留
    expect(amf.mtu).toBe(1500);
  });
});
