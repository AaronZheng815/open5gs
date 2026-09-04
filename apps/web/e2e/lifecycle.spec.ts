import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('AC-6/AC-5：生命周期页渲染状态标签；重启出二次确认，取消则不触发', async ({ page }) => {
  await login(page);
  await page.goto('/lifecycle');

  // AC-6：状态标签存在（真实 systemctl 只读；本机无 unit 时即「未知」，不断言具体值）
  await expect(page.getByText('网元生命周期')).toBeVisible();
  await expect(page.locator('.ant-tag').first()).toBeVisible();

  // AC-5 二次确认：点击重启弹 Modal.confirm，取消不动发请求（避免真实 systemctl restart）
  await page.getByRole('button', { name: /重\s*启/ }).click();
  const dialog = page.getByRole('dialog');
  // Modal.confirm 的「确认重启」同时作为对话框名（隐藏 aria 锚点）与可见标题，会命中两个元素；
  // 改用二次确认正文——唯一且可见，规避 strict mode 与 antd 内部类名
  await expect(dialog.getByText(/对 AMF 执行/)).toBeVisible();

  await dialog.getByRole('button', { name: /取\s*消/ }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
