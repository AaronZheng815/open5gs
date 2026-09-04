/**
 * 复用 passport-local-mongoose v8 默认口令哈希算法（webui 既有 Account 集合的 salt/hash 出自此算法）。
 * 默认值（passport-local-mongoose/lib/index.js L10-14）：saltlen=32、iterations=25000、keylen=512、
 * encoding='hex'、digestAlgorithm='sha256'。hash = pbkdf2(password, salt, ...) 的 hex 输出。
 */
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const SALT_LEN = 32;
const ITERATIONS = 25000;
const KEY_LEN = 512;
const DIGEST = 'sha256';
const ENCODING = 'hex';

/** 生成盐并哈希口令；传入 saltHex 时复用既有盐（用于校验/测试确定性）。 */
export function hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex ?? randomBytes(SALT_LEN).toString(ENCODING);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString(ENCODING);
  return { salt, hash };
}

/** 校验口令是否匹配存储的 salt+hash（timeSafeEqual 时间恒定比较）。 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const derived = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString(ENCODING);
  const a = Buffer.from(derived, ENCODING);
  const b = Buffer.from(storedHash, ENCODING);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
