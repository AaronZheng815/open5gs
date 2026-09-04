import { MongoClient } from 'mongodb';
import { E2E_MONGO_URI } from './env';
import { stopMockNrf } from './mock-nrf';

/** 全局清理：关闭 mock NRF + drop 隔离测试库（收尾，避免 e2e 数据残留）。 */
export default async function globalTeardown(): Promise<void> {
  await stopMockNrf();
  const client = new MongoClient(E2E_MONGO_URI);
  await client.connect();
  await client.db().dropDatabase();
  await client.close();
}
