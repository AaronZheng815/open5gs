import { test, expect } from '@playwright/test';
import { login, NAV_LABELS } from './helpers';
import { ADMIN_USER } from './env';

test('登录成功 → 进入 /assets 且五模块可见', async ({ page }) => {
  await login(page);
  for (const label of NAV_LABELS) {
    await expect(page.getByRole('menuitem', { name: label })).toBeVisible();
  }
});

test('错误口令 → 停留在 /login 并提示错误', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('用户名').fill(ADMIN_USER);
  await page.getByLabel('密码').fill('wrong-password');
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('.ant-message')).toBeVisible();
});
