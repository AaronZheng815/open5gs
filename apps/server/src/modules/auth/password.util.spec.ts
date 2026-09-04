import { hashPassword, verifyPassword } from './password.util';

describe('T-5 password util（passport-local-mongoose v8 兼容）', () => {
  it('hashPassword 生成 64 位盐 + 1024 位 hex hash（32 字节盐 / 512 字节 key）', () => {
    const { salt, hash } = hashPassword('Test@123');
    expect(salt).toHaveLength(64);
    expect(hash).toHaveLength(1024);
    expect(/^[0-9a-f]+$/i.test(salt)).toBe(true);
    expect(/^[0-9a-f]+$/i.test(hash)).toBe(true);
  });

  it('相同盐 + 相同口令 → 哈希确定一致', () => {
    const salt = 'a'.repeat(64);
    const a = hashPassword('pw', salt);
    const b = hashPassword('pw', salt);
    expect(a.hash).toBe(b.hash);
  });

  it('verifyPassword 对正确口令返回 true、错误口令返回 false', () => {
    const { salt, hash } = hashPassword('secret');
    expect(verifyPassword('secret', salt, hash)).toBe(true);
    expect(verifyPassword('wrong', salt, hash)).toBe(false);
  });

  it('长度不匹配的 hash 直接判 false（不抛）', () => {
    expect(verifyPassword('x', 'a'.repeat(64), 'not-a-1024-hash')).toBe(false);
  });
});
