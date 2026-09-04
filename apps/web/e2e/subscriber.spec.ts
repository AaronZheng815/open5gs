import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { login } from './helpers';
import { E2E_MONGO_URI, TEST_IMSI } from './env';

/** AC-13 落库断言：直接连隔离测试库数 subscribers。 */
async function countSubscribers(imsi: string): Promise<number> {
  const client = new MongoClient(E2E_MONGO_URI);
  await client.connect();
  const count = await client.db().collection('subscribers').countDocuments({ imsi });
  await client.close();
  return count;
}

test('AC-13：Subscriber 新建 → 列表出现该行 + MongoDB 落库计数为 1', async ({ page }) => {
  await login(page);
  await page.goto('/data');

  // Subscriber 页签默认激活 → 点新建
  await page.getByRole('button', { name: /新\s*建/ }).click();
  const dialog = page.getByRole('dialog');

  await dialog.getByLabel('IMSI').fill(TEST_IMSI);
  await dialog.getByLabel('鉴权密钥 K').fill('00112233445566778899aabbccddeeff');
  await dialog.getByRole('button', { name: /保\s*存/ }).click();

  // 列表重新拉取 → 新行出现
  await expect(page.getByRole('cell', { name: TEST_IMSI })).toBeVisible();

  // AC-13：Mongo 计数断言
  expect(await countSubscribers(TEST_IMSI)).toBe(1);
});
