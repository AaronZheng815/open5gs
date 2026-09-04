import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { ADMIN_USER, ADMIN_PASS } from './env';

/** 登录（admin / 自建口令）并等 URL 落到 /assets。 */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  // antd 会往两个汉字的按钮中插空格，故用正则匹配
  await page.getByLabel('用户名').fill(ADMIN_USER);
  await page.getByLabel('密码').fill(ADMIN_PASS);
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await expect(page).toHaveURL(/\/assets$/);
}

/** 五大导航模块文案（AC-10）。 */
export const NAV_LABELS = ['资产', '拓扑', '监控', '配置', '审计'] as const;
