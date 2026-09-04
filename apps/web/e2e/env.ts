/** 前端 e2e 共享常量：隔离测试库 + 自建 admin 账户（保证登录确定性，不依赖真实 open5gs 账号口令）。 */
export const E2E_MONGO_URI = process.env.NMS_E2E_MONGO_URI ?? 'mongodb://localhost/open5gs_nms_e2e';

export const ADMIN_USER = 'admin';
export const ADMIN_PASS = 'open5gs-nms-admin';
export const ADMIN_ROLES = ['admin'] as const;

/** 后端 / 前端进程名（供 webServer 与测试断言复用）。 */
export const BACKEND_PORT = 5000;
export const FRONTEND_PORT = 5173;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

/** mock NRF（h2c）端口：让 /api/nfs 稳定返回 200（AC-1/AC-8 资产表）+ 背景 NRF 不真实可达。 */
export const MOCK_NRF_PORT = 7780;
export const NRF_DISCOVERY_URL = `http://127.0.0.1:${MOCK_NRF_PORT}`;

/** 测试用订阅者 IMSI（AC-13 落库断言）。 */
export const TEST_IMSI = '460111234560099';
