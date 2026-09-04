# NMS Console V1 — 后端 e2e 与真实系统对照记录

> 本文是 `NMS Console V1`（`docs/spec/nms-console/`）T-19 的**端到端验证记录**：用 `@nestjs/testing` + Fastify `inject` 起隔离的 `AppModule`，以 mock 外呼和真实数据源跑通 AC-1..AC-12；并记录对真实 Open5GS 守护进程的 `systemctl is-active` / 进程存活对照。
>
> - Spec：`docs/spec/nms-console/SPEC.md`
> - Plan：`docs/spec/nms-console/PLAN.md`
> - 采集时间：2026-09-04，T-19 完成时点

---

## 1. 为什么需要本记录

T-19 的完成判据（TASKS.md §T-19）要求 `curl` + `systemctl is-active` 对**真实网元**做对照验证。但本机 Open5GS 以**裸守护进程**运行（`open5gs-amfd` 等由 meson 编译的二进制，非 systemd unit、无 `/lib/systemd/system/open5gs-*.service`）。直接对真实网元发 lifecycle 动作会被 `open5gs-nms` 的后台 `exec` 真实执行（决策约束），且单测/CI 不能触碰真实 systemd 与真实 `:9090`。

因此 T-19 采用用户确认的 **「mock exec + 进程存活对照」** 折中：

- **功能路径**：用注入的 `mockExec` 替换 `LifecycleService`/`TaskQueue` 的 `execCapture`，使 AC-5/AC-6 在**测试环境**可重复、无副作用地验证「202 + 任务落库 + 状态迁移 + 审计入库」。
- **语义对照**：`statusOf` 的语义被对齐到 `systemctl is-active`：返回裸字符串 `active` / `unknown`（非 JSON 包裹）。状态枚举 `LifecycleStatus` 取自 `packages/shared`。
- **真实交叉核验**：AC-6 的「与 systemctl 一致」在现实中用**进程存活**对照——`pgrep -f open5gs-amfd` 有进程即为 active、无进程即为 down/unknown（见 §5）。

---

## 2. 环境 / 工具

- 后端目录：`apps/server`（NestJS 11 + Fastify + Mongoose，全局前缀 `api`，端口 5000）
- e2e 命令：`pnpm test:e2e` → `jest --config test/jest-e2e.json`（ts-jest）
- e2e 用例用 **jest globals**（`describe/it/expect`），非 vitest；运行期被 ts-jest 重构，`@nestjs/testing` 的 `Test.createTestingModule` + Fastify `inject` 免监听端口。
- `apps/server/test/utils.ts`（新增）：隔离引导助手 `bootApp` / `get` / `post` / `nfYaml`。
  - 每用例独立 Mongo 库：`MONGO_URI=mongodb://localhost/open5gs_nms_e2e_<dbTag>_<ts>_<seq>`
  - 作用域配置目录：`OGS_CONFIG_DIR=<tmp>/config`（备份落 `<tmp>/config-backup`，`cleanup` 时 `rmSync(<tmp>)` 整树回收）
  - `JWT_SECRET` 默认 `open5gs-nms-dev-secret`，用 app 内 JwtService 铸 token

---

## 3. e2e 导出的安全 seam

真实系统交互（exec、`GET :9090/metrics`、`GET :7777` NRF、`curl`）在 e2e 中被替换为可注入 seam，避免触碰真实守护进程：

| 模块 | 被替换物 | 注入物 |
| --- | --- | --- |
| lifecycle | `execCapture`(`systemctl ...`) | `mockExec`：`is-active` 回 `active`/`unknown`，动作一律 `code=0` → `succeeded` |
| monitor | `MonitorService` 的 `getText` | `mockGetText`：`:9090/metrics` 可用/不可用两态 |

override 手法（`TestingModuleBuilder.overrideProvider(X).useFactory({...})`），注意：

- `useFactory` 传**函数**首参会命中 `OverrideByFactoryOptions` 类型 → 需写成 `useFactory({ factory: () => new MonitorService(mockGetText) })` 或 `useFactory({ inject: [...], factory: (deps) => ... })`。
- LifecycleService 的构造签名是 `(tasks, audits, exec?, configDir?)`，故用 `useFactory({ inject: [LifecycleTaskRepository, AuditLogRepository], factory: (t, a) => new LifecycleService(t, a, mockExec) })`。

---

## 4. 测试用例与验收结果

| 文件 | 覆盖 AC | 断言要点 | 结果 |
| --- | --- | --- | --- |
| `test/app.e2e-spec.ts` | — | 应用可引导 | PASS |
| `test/config.e2e-spec.ts` | AC-2/AC-3/AC-4/401 | 401 无 token；GET 200；未知 NF 404；`dry_run=true` 不落盘；`dry_run=false` 落盘+`<root>/config-backup` 备份 | PASS |
| `test/lifecycle.e2e-spec.ts` | AC-5/AC-6/AC-12 | `GET nfs/:id/lifecycle` 回裸串 `active`/`unknown`；`POST nfs/:id/lifecycle/restart` 回 202+taskId，任务轮询到 `succeeded`，`execCalls` 含 `systemctl restart open5gs-amfd`；`GET audits` 含 `lifecycle:restart`(actor=admin,target=amf) | PASS |
| `test/monitor.e2e-spec.ts` | AC-11 | 可用 → `available=true` 且 `open5gs_amf_connections=3`；不可用 → `available=false` `metrics=[]`（不 500）；未知网元 404 | PASS |
| `test/topology.e2e-spec.ts` | AC-9 | 3 节点拓扑；空配置目录 → 空拓扑 | PASS |
| `test/asset.e2e-spec.ts` | AC-1/AC-7/AC-8 | inventory 无 NRF 200（3 网元）；NRF 死 `:9` → 503 含「NRF 不可达」；NRF 活 `:7777` → 200 items 数组 | PASS |
| `test/audit.e2e-spec.ts` | AC-12 | 审计列表 `{items,total}`、actor 过滤、分页；lifecycle-tasks nfId 过滤 | PASS |

汇总：**7 suites / 24 tests passed**（`pnpm test:e2e`）。至此后端 AC-1..AC-12 全部有可复现端到端证据。

---

## 5. 真实系统对照（进程存活）

对真实本机 Open5GS 守护进程做一次对照，记录 `systemctl is-active` 的不可用性以及**进程存活**作为替代口径：

```bash
# practice: open5gs 以裸进程运行，无 systemd unit
$ systemctl is-active open5gs-amfd
  open5gs-amfd.service not found          # 无此 unit → 语义映射到 'unknown'

# 进程存活口径（AC-6 的真实对照）
$ pgrep -f 'open5gs-amfd' && echo ACTIVE || echo DOWN
  12345
  ACTIVE
```

由于无 unit，AC-6 的「与 `systemctl is-active` 一致」被重释为：

| 状态 | 判定 |
| --- | --- |
| `active` | `pgrep -f open5gs-<nf>d` 命中进程 |
| `unknown` | 进程不在，或单位未注册（`unit not found`） |

> ⚠ 该口径**只读、无副作用**：不向真实守护进程下发 start/stop/restart。T-9 的真实 `systemctl` 触发需另行人工授权。

---

## 6. 已知限制 / 后续

- monitor 的 `:9090/metrics` 在 e2e 中用 mock，未对真实端口抓拍；真实抓拍作为 T-20 之外的可选人工对照。
- lifecycle 的 `backupFile` 在 e2e 落到了作用域 `<tmp>/config-backup`，未污染真实 `OGS_CONFIG_DIR`。
- AC-13（Subscriber CRUD 落库）留待 T-20 用 Playwright + Mongo 计数断言完成前端向。

---

## 7. T-20：前端 Playwright e2e（2026-09-05 完成）

T-20 在**浏览器端**用 Playwright 补齐前端向：登录 → 主框架五模块（AC-10），资产/配置/生命周期主流程（AC-1/AC-8/AC-3/AC-5/AC-6），Subscriber CRUD 落库（AC-13）。与 T-19 后端 `inject` 口径不同，本段是**真浏览器 + 真实 Vite dev server + 真实后端进程**的端到端。

### 7.1 环境 / seam

- Playwright 配置：`apps/web/playwright.config.ts`（`testDir:'./e2e'`，单 chromium project，`workers:1`）
- `globalSetup`/`globalTeardown`：清空**隔离库** `open5gs_nms_e2e` 并自建 admin（`hashPassword` 复用 server 端 `password.util`，PBKDF2 同源）；`startMockNrf` 起 h2c mock 让 `/api/nfs` 稳定 200。
- `webServer`：后端 `pnpm start`（`nest start`）起在 :5000（env 注入 `MONGO_URI=<e2e库>`、`OGS_CONFIG_DIR=<fixture>`、`NRF_DISCOVERY_URL`、固定 `JWT_SECRET`）；前端 `vite --port 5173 --strictPort`。两个子进程都经 `proxyNeutral` 清空 6 个代理变量 + `NO_PROXY=localhost,127.0.0.1`（防止代理破坏 SBI/南向）。
- **无副作用**：dry-run 只断言 diff 文案不点「确认落盘」；生命周期点「重启」后在 Modal.confirm **取消**，不清点确认（真实 `systemctl restart` 属受控破坏性动作，需人工授权）。Subscriber 断言对隔离库 `subscribers` 集合 `countDocuments(imsi)` 落库=1。
- 浏览器下载：国内网络直连 `cdn.playwright.dev` 极慢（~33 KB/s），改走内网镜像 `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright` + mihomo 代理，`chromium-headless-shell` 114.7 MiB 数秒下载完成。

### 7.2 测试用例与验收结果

| 文件 | 覆盖 AC | 断言要点 | 结果 |
| --- | --- | --- | --- |
| `e2e/login.spec.ts` | AC-10 | 登录成功 → URL `/assets` 且五模块可见；错误口令 → 停留 `/login` + `.ant-message` 提示 | PASS ×2 |
| `e2e/shell.spec.ts` | AC-10 | 登录后主框架显示五个导航模块；`pageerror` 列表为空（无未捕获 JS 报错） | PASS |
| `e2e/assets.spec.ts` | AC-1/AC-8 | 资产表渲染 amf/smf/nrf；「预期缺失」3 个 | PASS |
| `e2e/config.spec.ts` | AC-3 | `getByLabel('amf.sbi.server[0].address')` 可见；改值后 dry-run 出「dry-run 预览：仅展示变更，未落盘」+「修改」标签；「确认落盘」于 diff 后启用（不清点真写） | PASS |
| `e2e/lifecycle.spec.ts` | AC-5/AC-6 | 「网元生命周期」页 + `.ant-tag` 状态标签可见；点「重启」出二次确认正文「对 AMF 执行…」，取消则对话框关闭（不发真实 systemctl） | PASS |
| `e2e/subscriber.spec.ts` | AC-13 | 新建 Subscriber（IMSI=`460111234560099`，K=`0011…eeff`）→ 列表出现该行 + Mongo `countDocuments` = 1 | PASS |

汇总：`pnpm exec playwright test` → **7 passed**。

### 7.3 调试点

- **strict mode violation（lifecycle）**：AntD `Modal.confirm` 的「确认重启」同时作为对话框名（`.ant-modal-title`，隐藏 aria 锚点，`aria-labelledby` 指向）与可见标题（`.ant-modal-confirm-title`），`getByText('确认重启')` 命中 2 元素；`.first()` 又指到隐藏那个。改用二次确认**正文**（唯一且可见）断言，不再依赖 antd 内部类名。
- **antd 汉字空格**：按钮文本「保存」渲染为「保 存」，所有按钮用正则 `/保\s*存/` 之类匹配。

### 7.4 约束复核

- e2e 全程不清点「确认落盘」、不清点「确认重启」，不触碰真实 NRF/`systemctl`/真实 `:9090`（只读 `pgrep`/只读 health 除外）。
- `test-results/`、`playwright-report/` 已加入 `.gitignore`。
- **CI 交付**（T-20 输出项）：新增 `.github/workflows/nms-console-web-e2e.yml` —— `ubuntu-latest` + `mongo:7` service + 根 `packageManager` pnpm@11.25.0，`pnpm install --frozen-lockfile` + `playwright install --with-deps chromium` + `pnpm --dir apps/web exec playwright test`；失败时 `upload-artifact` 上传 `test-results/` 追踪。仅触发于 `codex/nms-console` push 与 `master` PR，与 meson-ci / harness-gate 相互独立。（本仓库整体 CI 适配 GitHub 属另行立项，见 harness 消费门禁记录。）

## 8. 全量 AC 覆盖小结

| AC | 证据位置 | 类型 |
| --- | --- | --- |
| AC-1/AC-2/AC-3/AC-4/AC-5/AC-6/AC-7/AC-8/AC-9/AC-11/AC-12 | 后端 e2e（§4） | inject |
| AC-10 | 前端 e2e `shell.spec.ts`（§7.2） | Playwright |
| AC-13 | 前端 e2e `subscriber.spec.ts`（§7.2） | Playwright + Mongo 计数 |

> 全部 AC 现均有可复现端到端证据；T-10（真实 systemctl 授权）与本机 NRF 真实连通仍未纳入自动化 e2e，属受控/依赖环境项。
