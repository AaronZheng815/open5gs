import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('AC-1/AC-8：资产页渲染本地清单（mock NRF 可达 → 200 + 叠加）', async ({ page }) => {
  await login(page);

  // 默认落地 /assets；mock NRF 返回空 nfInstances → 本地清单 amf/smf/nrf 均 offline+expected
  await expect(page.getByRole('cell', { name: 'amf' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'smf' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'nrf' })).toBeVisible();
  // 三网元均在本地清单但不在 NRF → 差值标记「预期缺失」
  await expect(page.getByText('预期缺失')).toHaveCount(3);
});
