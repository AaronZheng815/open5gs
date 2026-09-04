import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth-store';

const STORAGE_KEY = 'nms.auth';

describe('T-13 auth store (zustand)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, username: null, roles: [] });
  });

  it('setAuth 写入内存 + localStorage（Zustand 初始化 + 持久化）', () => {
    useAuthStore.getState().setAuth('abc123', 'admin', ['admin']);
    expect(useAuthStore.getState()).toMatchObject({
      token: 'abc123',
      username: 'admin',
      roles: ['admin'],
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      token: 'abc123',
      username: 'admin',
      roles: ['admin'],
    });
  });

  it('clearAuth 清空内存 + localStorage', () => {
    useAuthStore.getState().setAuth('abc123', 'admin', ['admin']);
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState()).toMatchObject({ token: null, username: null, roles: [] });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
