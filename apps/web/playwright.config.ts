import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { E2E_MONGO_URI, BACKEND_URL, FRONTEND_URL, BACKEND_PORT, NRF_DISCOVERY_URL } from './e2e/env';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(__dirname, '..', 'server');
const FIXTURE_CFG_DIR = join(__dirname, 'e2e', 'fixtures', 'open5gs-config');

// 存活代理环境变量会破坏后端 SBI/南向联通（见 memory：open5gs-proxy-env-breaks-sbi），
// 子进程必须清空 6 个代理变量，仅留 NO_PROXY。用空串覆盖继承值。
const proxyNeutral: Record<string, string> = {
  HTTP_PROXY: '',
  HTTPS_PROXY: '',
  ALL_PROXY: '',
  http_proxy: '',
  https_proxy: '',
  all_proxy: '',
  NO_PROXY: 'localhost,127.0.0.1',
};

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // 后端：隔离测试库 + 作用域配置目录 + 固定 JWT secret，起在 :5000
      command: 'pnpm start',
      cwd: SERVER_DIR,
      env: {
        ...proxyNeutral,
        MONGO_URI: E2E_MONGO_URI,
        JWT_SECRET: 'open5gs-nms-dev-secret',
        OGS_CONFIG_DIR: FIXTURE_CFG_DIR,
        NRF_DISCOVERY_URL,
        PORT: String(BACKEND_PORT),
      },
      url: `${BACKEND_URL}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // 前端：vite dev server，代理 /api → :5000
      command: 'pnpm exec vite --port 5173 --strictPort',
      cwd: __dirname,
      env: proxyNeutral,
      url: FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
