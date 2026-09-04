import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('AC-3：dry-run 预览 diff 且不落盘；落盘按钮于 diff 后启用', async ({ page }) => {
  await login(page);
  await page.goto('/config');

  // 默认选中 amf；等配置表单加载出 address 字段
  const addr = page.getByLabel('amf.sbi.server[0].address');
  await expect(addr).toBeVisible();
  await addr.fill('127.0.0.99'); // 改动一点，让 diff 非空

  await page.getByRole('button', { name: /dry-run/ }).click();

  // AC-3：dry_run=true 不写盘，前端展示 diff + 说明文案
  await expect(page.getByText('dry-run 预览：仅展示变更，未落盘')).toBeVisible();
  await expect(page.getByText('修改', { exact: true })).toBeVisible();

  // 确认落盘（写盘）需 diff 才有，这里只断言其启用，不触发真实写盘（保持无副作用）
  await expect(page.getByRole('button', { name: /确认落盘/ })).toBeEnabled();
});
