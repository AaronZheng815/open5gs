import { test, expect } from '@playwright/test';
import { login, NAV_LABELS } from './helpers';

test('AC-10：登录后主框架显示五个导航模块，无未捕获 JS 报错', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await login(page);

  for (const label of NAV_LABELS) {
    await expect(page.getByRole('menuitem', { name: label })).toBeVisible();
  }

  // AC-10 的"无未捕获 JS 报错"指未捕获 JS 异常（pageerror），网络 503 由 react-query 捕获降级不算
  expect(pageErrors).toEqual([]);
});
