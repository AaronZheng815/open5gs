import { MongoClient } from 'mongodb';
import { hashPassword } from '../../server/src/modules/auth/password.util';
import { E2E_MONGO_URI, ADMIN_USER, ADMIN_PASS, ADMIN_ROLES, MOCK_NRF_PORT } from './env';
import { startMockNrf } from './mock-nrf';

/**
 * 全局前置：
 * 1. 清空隔离测试库并自建 admin 账户（口令确定，保证登录 spec 稳定）。
 *    复用 server 端 password.util 的同一 PBKDF2 算法，避免与生产口令算法漂移。
 * 2. 启动 mock NRF（h2c），让 /api/nfs 稳定 200（AC-1/AC-8 资产表可渲染）。
 */
export default async function globalSetup(): Promise<void> {
  const client = new MongoClient(E2E_MONGO_URI);
  await client.connect();
  const db = client.db();

  // 干净起点：先 drop，再 seed（subscribers / lifecycle_tasks / audit_logs 随测试懒创建）
  await db.dropDatabase();

  const { salt, hash } = hashPassword(ADMIN_PASS);
  await db.collection('accounts').updateOne(
    { username: ADMIN_USER },
    {
      $set: { username: ADMIN_USER, salt, hash, roles: [...ADMIN_ROLES] },
    },
    { upsert: true },
  );

  await client.close();

  // mock NRF 常驻到 teardown（global-setup 与 teardown 是不同模块，句柄留在 mock-nrf 模块内）
  await startMockNrf(MOCK_NRF_PORT);
}
