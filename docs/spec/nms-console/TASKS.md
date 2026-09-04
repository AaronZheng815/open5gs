---
tasks_id: open5gs-nms-console
spec: SPEC.md
plan: PLAN.md
status: in_progress
branch: codex/nms-console
target_branch: master
merge_method: no_squash
created_at: 2026-09-04
updated_at: 2026-09-04
---

# Tasks: NMS Console V1 — 网元资产发现与配置/生命周期管理

> 每个 task 均为单一职责、0.5d–1d 粒度、可独立验证、有可观察完成判据。全部完成后创建唯一 MR（no squash）。

## 进度概览

| 状态 | 数量 |
| --- | --- |
| `todo` | 15 |
| `doing` | 0 |
| `done` | 5 |
| `blocked` | 0 |

## 交付策略

- **工作分支**：`codex/nms-console`
- **目标分支**：`master`
- **执行模式**：Guarded Auto（TASKS approved 后自动执行 pending tasks；命中 high-risk gate 时暂停请示）
- **MR 粒度**：final only（所有 tasks done 后创建一个 MR）
- **合并方式**：no squash（保留每个 task commit）

## Tasks

### T-1：monorepo 与工具链脚手架（pnpm + Turborepo + 三包）

- **目标**：建立 pnpm workspace + Turborepo，创建 `apps/server`、`apps/web`、`packages/shared` 三包骨架并接好共享 tsconfig / eslint / prettier / jest / vitest，`pnpm install` 与 `pnpm build` 通过。
- **AC 关联**：支撑 AC-10（前端脚手架 P0，F-7）
- **输入**：仓库根目录；决策 2.7（pnpm+Turborepo monorepo）
- **输出**：`pnpm-workspace.yaml`、`turbo.json`、根 `package.json`、`apps/server/package.json`、`apps/web/package.json`、`packages/shared/package.json`、共享 `tsconfig.base.json`、eslint/prettier 配置、`apps/server` + `apps/web` 最小可启动 HelloWorld。
- **完成判据**：
  - [ ] `pnpm install` 0 error；`pnpm --filter open5gs-server build` 与 `pnpm --filter open5gs-web build` 均成功
  - [ ] `apps/server` 以 NestJS + Fastify 适配器启动并返回 Hello 响应；`apps/web` 以 Vite 启动并渲染 HelloDOM
  - [ ] `pnpm lint` 0 error；`pnpm test`（占位测试）通过
  - [ ] `pnpm lint` 0 error（多包根级校验）
- **预估工时**：1d
- **责任人**：sder
- **状态**：`done`
- **Commit**：101c81677

### T-2：packages/shared Zod 类型单一来源

- **目标**：在 `packages/shared` 定义前后端共享的 Zod schema/DTO/enums（NfAsset、ConfigDoc、ConfigDiff、LifecycleAction/Status、TaskId、MetricSnapshot、TopologyGraph、AuditLog、登录/角色 DTO），作为类型单一来源。
- **AC 关联**：支撑 AC-1/AC-2/AC-3/AC-4/AC-5/AC-6/AC-9/AC-11/AC-12/AC-13（对外 API 与前端共享类型；决策 2.7）
- **输入**：T-1；PLAN §5.2 内部接口签名；SPEC §5.1 API 语义
- **输出**：`packages/shared/src/{nf-asset,config,lifecycle,monitor,topology,audit,auth}.schema.ts` 及 `index.ts` 导出；`pnpm --filter open5gs-shared build` 产出类型。
- **完成判据**：
  - [ ] 每类 DTO 均以 `z.object()` 定义并 `z.infer` 导出 TS 类型，无 `any`
  - [ ] 同一类 Zod schema 可被 `apps/server` 与 `apps/web` 同时 `import`，`pnpm build` 通过
  - [ ] 从 schema 派生的类型在测试中被断言使用（类型单测）
  - [ ] `pnpm lint` 0 error、`pnpm test` 通过
- **预估工时**：0.5d
- **责任人**：sder
- **状态**：`done`
- **Commit**：82b00e163

### T-3：NestJS 基础设施引导（Fastify 适配器 + 去代理 + 异常 + Swagger + Mongoose + 配置）

- **目标**：完成 `apps/server` 的 NestJS 引导：Fastify 适配器、全局去代理 `ProxyFilter`（本地回路走 NO_PROXY，spawn 前清代理 env，决策 2.6）、ProblemDetails 风格全局异常过滤器、`@nestjs/swagger` OpenAPI 3.0 装配、`@nestjs/mongoose` 连接 `mongodb://localhost/open5gs`、env/config 读取（含 NRF 地址、后端端口）。
- **AC 关联**：支撑 AC-1/AC-6/AC-7（去代理保证 SBI/status 真实联通；错误骨架；决策 2.1/2.6）
- **输入**：T-1、T-2；基线 §8（数据库与地址表）；本机代理破坏 SBI 约束（无 `NO_PROXY` 时 NRF 502）
- **输出**：`apps/server/src/main.ts`、`apps/server/src/app.module.ts`、`apps/server/src/common/{proxy.filter,http-exception.filter,openapi.setup,mongoose.schema}.{ts}`、`.env.example`、`apps/server/src/config/`。
- **完成判据**：
  - [ ] `pnpm --filter open5gs-server start` 启动在配置端口，`GET /api/health` 返回 200；Swagger 在 `/api/docs` 打开
  - [ ] 对 `127.x`/`localhost` 的 fetch 发出的请求不带代理（单测断言）；`spawn` 子进程 env 无 `HTTP_PROXY`/`HTTPS_PROXY`
  - [ ] 未捕获异常统一返回 ProblemDetails 骨架（`type/title/status/detail`），而非默认 Nest 错误体
  - [ ] `pnpm test`（infra 单测）通过且覆盖率 ≥ 80%
- **预估工时**：1d
- **责任人**：sder
- **状态**：`done`
- **Commit**：1c28c71d3

### T-4：Mongoose 数据层（subscriber/profile/account 复用 + audit_logs + lifecycle_tasks）

- **目标**：建立数据层：复用现有 `subscribers`/`profiles`/`accounts` Mongo 集合的 schema（schema 不变，F-8），并新增 `audit_logs`、`lifecycle_tasks` 集合 schema 与索引（`(nf_id, created_at)`、`(actor, ts)`）。
- **AC 关联**：支撑 AC-12、AC-13、AC-5（数据模型 §6；决策 2.9）
- **输入**：T-3；基线 §6 数据模型；PLAN §6 数据模型
- **输出**：`apps/server/src/db/{subscriber,profile,account,audit-log,lifecycle-task}.schema.ts`（Mongoose Schema/装饰器），以及对应 Repository/service 的 CRUD 基础方法。
- **完成判据**：
  - [x] 访问既有集合不报 schema 冲突；`subscribers` 集合数据可被读回（与现有 webui 一致）— 实时验证 readback imsi=460001234560001，字段含 mme_host/purge_flag/access_restriction_data/security.sqn/…（cd1915eb8）
  - [x] `audit_logs`/`lifecycle_tasks` 集合可通过 mongoose 建库，索引创建成功（`db.collection.getIndexes()` 校验）— dist 实时 ensureIndexes → audit_logs indexes `[{_id:1},{actor:1,ts:-1}]`、lifecycle_tasks `[{_id:1},{nfId:1,createdAt:-1}]`（cd1915eb8）
  - [x] 数据层单测断言 CRUD 基本方法与索引 — db.schemas.spec.ts(6)+db.repositories.spec.ts(6)=18 断言（cd1915eb8）
  - [x] `pnpm test` 通过且覆盖率 ≥ 80% — 18 passed；coverage stmts 98.31/lines 97.93/funcs 92.3（cd1915eb8）
- **预估工时**：0.5d
- **责任人**：sder
- **状态**：`done`
- **Commit**：cd1915eb8

### T-5：auth 模块（登录复用 Account + JwtAuthGuard + RolesGuard）

- **目标**：`POST /api/login` 复用现有 Account 集合校验，签发/校验 JWT；实现 `JwtAuthGuard`、`RolesGuard`，按 Spec §6 约束生命周期操作仅开发/测试/运维角色可执行。
- **AC 关联**：支撑 AC-13（登录）、AC-5/AC-12（角色受控，§6 安全）
- **输入**：T-3、T-4；SPEC §6 安全约束（Q2 授权范围）
- **输出**：`apps/server/src/modules/auth/{auth.module,auth.controller,auth.service,jwt-auth.guard,roles.guard,current-user.decorator}.ts`，`@Roles(...)` 装饰器。
- **完成判据**：
  - [x] 合法凭证 `POST /api/login` 返回 200 + access_token；非法凭证返回 401 — 实时 curl：valid HTTP 200 token_len=199；wrong password HTTP 401 ProblemDetails；missing fields HTTP 400（<pending>）
  - [x] 无 token 访问受保护路由返回 401；token 有效返回 200 — JwtAuthGuard 单测（缺失→401、verify 拒绝→401、有效→放行挂 req.user）（<pending>）
  - [x] RolesGuard 对生命周期写操作：角色 ∈ {开发,测试,运维} 放行，否则 403 — RolesGuard 单测（dev 放行 / admin → 403 / 缺 user → 403）（<pending>）
  - [x] `pnpm test` 通过且覆盖率 ≥ 80% — 32 passed；coverage stmts ~98.9 / lines 98.7（<pending>）
- **预估工时**：0.5d
- **责任人**：sder
- **状态**：`done`
- **Commit**：<pending>

### T-6：subscriber/profile/account 三模块 CRUD 后端平移

- **目标**：平移现有 Subscriber/Profile/Account 三模块 CRUD 到新后端（列表/新建/编辑/删除），MongoDB schema 与数据模型不变（N3/F-8/AC-13）。
- **AC 关联**：实现 AC-13（后端半段）
- **输入**：T-4、T-5；现有 `webui/server` 的 CRUD 端点语义（保持行为对等）
- **输出**：`apps/server/src/modules/{subscriber,profile,account}/{*.module,*.controller,*.service}.ts`，提供 `GET/POST/PUT/DELETE` 对应路由。
- **完成判据**：
  - [ ] Subscriber/Profile/Account 三类资源各自 `GET`（列表）/`POST`（新建）/`PUT`（编辑）/`DELETE`（删除）返回 200 且写操作持久化到 MongoDB（supertest + 真库断言）
  - [ ] 删除/新建操作前后 `subscribers` 集合计数变化正确
  - [ ] 复用现有 schema 字段（imsi/k/opc/amf/slice 等）无数据清洗
  - [ ] `pnpm test` 通过且覆盖率 ≥ 80%
- **预估工时**：0.5d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-7：asset 模块（本地清单离线兜底 + NRF 在线叠加 + 503 错误）

- **目标**：`GET /api/inventory` 仅由本地 `configs/open5gs/*.yaml` 解析出资产模型（离线兜底，AC-8）；`GET /api/nfs` 以本地清单为根、叠加 NRF 注册发现得到在线状态（AC-1）；NRF 不可达时返回 503 + 错误原因（AC-7）。资产主表为本地清单（决策 2.3）。
- **AC 关联**：实现 AC-1 / AC-7 / AC-8
- **输入**：T-3、T-2；基线 §3/§4（16 网元地址/角色表）；EV-001、EV-005
- **输出**：`apps/server/src/modules/asset/{asset.module,asset.controller,asset.service,inventory.loader,discovery.client}.ts`，`listNfs()`、`loadInventory()`、`resolveStatus()`。
- **完成判据**：
  - [ ] `GET /api/inventory` 在 NRF 未配置/不可达时仍返回 200 且 items 含 16 网元资产模型（nfType/addr/role）
  - [ ] 配 NRF 且 NRF 可达时 `GET /api/nfs` 返回 200，已注册网元 status=`online`，未注册（预期但缺）网元带差值标记
  - [ ] NRF 不可达时 `GET /api/nfs` 返回 503 且 body 含错误原因（不抛 500）
  - [ ] `pnpm test`（inventory/asset 单测 + 集成）通过且覆盖率 ≥ 80%
- **预估工时**：1d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-8：config 模块（读 + diff + dry-run + 写回并备份）

- **目标**：`GET /api/nfs/{id}/config` 读取并结构化解析 `configs/open5gs/*.yaml`（AC-2）；`POST /api/nfs/{id}/config?dry_run=true` 只返回前后 diff 不落盘（AC-3）；`dry_run=false` 落盘写入并返回被修改 diff，写前生成时间戳备份（AC-4）。写回走结构化字段编辑→yaml 生成（决策 2.5）。
- **AC 关联**：实现 AC-2 / AC-3 / AC-4
- **输入**：T-3、T-2；EV-005；决策 2.5；§10 风险（写前备份）
- **输出**：`apps/server/src/modules/config/{config.module,config.controller,config.service,diff.util,yaml.util,backup.util}.ts`，`readConfig()`、`applyConfig()`；`config-backup/*.yaml`（时间戳后缀）。
- **完成判据**：
  - [ ] `GET /api/nfs/{id}/config` 返回 200 与结构化 JSON，字段与目标 yaml 对应（AC-2）
  - [ ] `?dry_run=true` 返回 200 + diff，目标配置文件 mtime/内容不变（不落盘断言，AC-3）
  - [ ] `?dry_run=false` 返回 200 + diff，目标文件被写入，且 `config-backup/` 出现写前备份文件（AC-4）
  - [ ] `pnpm test`（yaml 解析/diff/备份）通过且覆盖率 ≥ 80%
- **预估工时**：1d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-9：lifecycle 模块（systemctl 编排 + 任务队列 + 状态 + 审计）

- **目标**：`POST /api/nfs/{id}/lifecycle/{action}` 触发 `systemctl {start|stop|restart|reload} open5gs-<nf>d`，返回 202 + 异步任务 id（AC-5）；`GET /api/nfs/{id}/lifecycle` 返回与 `systemctl is-active` 一致的服务状态（AC-6）；写操作前生成配置备份、执行后写审计日志（对策 2.4 + AC-12）。任务状态机 Queued→Running→Succeeded/Failed/RolledBack（PLAN §7）。
- **AC 关联**：实现 AC-5 / AC-6 / AC-12（审计写入）
- **输入**：T-3、T-2、T-4；EV-006；决策 2.4；PLAN §7 状态机
- **输出**：`apps/server/src/modules/lifecycle/{lifecycle.module,lifecycle.controller,lifecycle.service,task.queue,status.util,backup.util}.ts`；`lifecycle_tasks` 记录；`audit_logs` 写入。
- **完成判据**：
  - [ ] `POST /api/nfs/{id}/lifecycle/restart` 返回 202 + task id，并实际触发对应 systemd 单元（mock child_process 断言命令与参数）
  - [ ] `GET /api/nfs/{id}/lifecycle` 返回状态与 `systemctl is-active` 输出一致（集成 + 对照断言）
  - [ ] 每次写操作在 `audit_logs` 生成一条（操作者/动作/对象/时间/结果）；任务在 `lifecycle_tasks` 记录并可查询
  - [ ] `pnpm test` 通过且覆盖率 ≥ 80%
- **预估工时**：1d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-10：monitor 模块（:9090/metrics + Info API 快照）

- **目标**：`GET /api/metrics/{nf}/snapshot` 抓取该网元 `:9090/metrics` Prometheus 文本并解析关键指标摘要；对支持 Info API 的网元（AMF/SMF/MME）同时读取 `/pdu-info`/`/gnb-info`/`/ue-info`/`/enb-info`；`getStatus` 不可用网元降级返回并标注无指标（SPEC §8 风险）。
- **AC 关联**：实现 AC-11
- **输入**：T-3、T-2；EV-003、EV-004
- **输出**：`apps/server/src/modules/monitor/{monitor.module,monitor.controller,monitor.service,metrics.parser,info-api.client}.ts`；返回快照 DTO。
- **完成判据**：
  - [ ] `GET /api/metrics/{nf}/snapshot` 对开启 `:9090` 的网元返回 200、指标非空、可解析（如 AMF）
  - [ ] 对未开启 `:9090` 的网元返回 200 且降级字段标注"无指标"（不 500）
  - [ ] Prometheus text 解析器单测覆盖 gauge/counter/label 解析；Info API pager 语义正确处理
  - [ ] `pnpm test` 通过且覆盖率 ≥ 80%
- **预估工时**：0.5d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-11：topology 模块（节点 + 边）

- **目标**：`GET /api/topology` 由资产 + 依赖关系表 + NRF 注册信息生成节点 + 边结构化数据（如 AMF→NRF、SMF→UPF、SMF→PCF）。
- **AC 关联**：实现 AC-9
- **输入**：T-3、T-7；基线 §2 架构图依赖边；EV-005
- **输出**：`apps/server/src/modules/topology/{topology.module,topology.controller,topology.service,edges.map}.ts`；返回 `{nodes:[], edges:[{source,target,label}]}`。
- **完成判据**：
  - [ ] 响应含节点与边集合；关键边（AMF→NRF、SMF→UPF、SMF→PCF、MME→HSS）存在
  - [ ] 节点 id 与 `GET /api/nfs` / `GET /api/inventory` 资产 id 一致（可关联）
  - [ ] `pnpm test` 通过且覆盖率 ≥ 80%
- **预估工时**：0.5d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-12：audit 查询端点（GET /api/audits + /api/lifecycle-tasks）

- **目标**：提供审计日志与生命周期任务列表查询端点，供前端审计页/任务页展示（AC-12 前端数据）。
- **AC 关联**：实现 AC-12（查询半段）
- **输入**：T-4、T-9
- **输出**：`apps/server/src/modules/audit/{audit.module,audit.controller,audit.service}.ts`；`GET /api/audits`、`GET /api/lifecycle-tasks`。
- **完成判据**：
  - [ ] `GET /api/audits` 返回审计日志列表（含操作者/动作/对象/时间/结果），支持分页
  - [ ] `GET /api/lifecycle-tasks` 返回任务列表（含状态/动作/对象/创建时间）
  - [ ] `pnpm test` 通过且覆盖率 ≥ 80%
- **预估工时**：0.5d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-13：前端脚手架 + 应用外壳（React19 + Vite + AntD + 路由 + 五大模块）

- **目标**：搭建 React 19 + Vite + TypeScript + Ant Design 前端，接入 TanStack Query + Zustand + React Router 7，建立 login 页 + 主框架（五种导航模块：资产/拓扑/监控/配置/审计页面占位路由），并封装 API client（读 `packages/shared`）。主页面无未捕获 JS 报错。
- **AC 关联**：实现 AC-10
- **输入**：T-1、T-2、T-13 依赖后端各模块（登录至少 T-5）
- **输出**：`apps/web/src/{main.tsx,App.tsx,router.tsx,providers.tsx}`、`apps/web/src/api/client.ts`、`apps/web/src/pages/{assets,topology,monitor,config,audit}/index.tsx`、`apps/web/src/app-shell/{SideNav,Header}.tsx`、AntD 主题/配置初始化。
- **完成判据**：
  - [ ] 登录后主框架渲染五个导航模块且路由可切换，无未捕获 JS 报错（Playwright/console 断言）
  - [ ] TanStack Query + Zustand 初始化可用；API client 基于 `packages/shared` 类型，无重复手写 DTO
  - [ ] Vite 开发代理 `/api` → 后端已配置
  - [ ] `pnpm test`（Vitest 空壳 + hooks 单测）通过；`pnpm build` 成功
- **预估工时**：1d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-14：前端资产页（表格 + 在线状态 + 错误态）

- **目标**：资产页以 AntD Table 展示网元资产（类型/角色/地址/在线/版本/版本-差值标记）；NFR 不可达时显示平台告警提示而非白屏（AC-7）。
- **AC 关联**：实现 AC-1 / AC-7 / AC-8（前端展示）
- **输入**：T-13、T-7
- **输出**：`apps/web/src/pages/assets/assets-page.tsx`（+ 状态列/差值列/告警 Alert）、`apps/web/src/hooks/useNfs.ts`。
- **完成判据**：
  - [ ] 资产表格渲染通过 `GET /api/nfs` 的数据（在线/离线/差值列正确）
  - [ ] 模拟后端 503（NRF 不可达）时页面显示 Alert 告警而非白屏/未捕获异常
  - [ ] `pnpm test`（渲染 + 错误态）通过；`pnpm build` 成功
- **预估工时**：0.5d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-15：前端配置页（查看/编辑/diff/dry-run）

- **目标**：配置页展示某网元结构化配置，支持字段编辑、`dry-run` 前后 diff 预览、确认落盘（含写前提示）。面向 AC-2/AC-3/AC-4。
- **AC 关联**：实现 AC-2 / AC-3 / AC-4（前端交互）
- **输入**：T-13、T-8
- **输出**：`apps/web/src/pages/config/config-page.tsx`、`apps/web/src/hooks/useConfig.ts`、diff 展示组件（AntD `diff`/高亮）、dry-run Modal。
- **完成判据**：
  - [ ] 加载某网元配置并结构化展示（AC-2）
  - [ ] 编辑后点 dry-run 展示 diff 且未落盘（AC-3）；确认落盘成功且显示 diff（AC-4）
  - [ ] `pnpm test`（表单校验 + dry-run 流程）通过；`pnpm build` 成功
- **预估工时**：1d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-16：前端生命周期页（操作 + 二次确认 + 状态 + 任务历史）

- **目标**：生命周期页对指定网元执行 启停/重启/重载，带二次确认弹窗（高风险操作，§6 安全），操作后回读状态并展示任务历史与审计记录。
- **AC 关联**：实现 AC-5 / AC-6 / AC-12（前端）
- **输入**：T-13、T-9、T-12
- **输出**：`apps/web/src/pages/lifecycle/lifecycle-page.tsx`、`apps/web/src/hooks/useLifecycle.ts`、二次确认 Modal、`GET /api/audits`+`/api/lifecycle-tasks` 展示组件。
- **完成判据**：
  - [ ] 触发 restart 前弹出二次确认，确认后调用 API 并展示返回的 202 + task id（AC-5）
  - [ ] 生命周期状态列与后端 status 一致（AC-6）
  - [ ] 任务历史/审计列表可展示（AC-12）
  - [ ] `pnpm test` 通过；`pnpm build` 成功
- **预估工时**：0.5d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-17：前端监控 + 拓扑页（ECharts + AntV G6）

- **目标**：监控页用 ECharts 展示关键指标快照/趋势；拓扑页用 AntV G6 渲染 `GET /api/topology` 的节点+边。
- **AC 关联**：实现 AC-11 / AC-9（前端）
- **输入**：T-13、T-10、T-11
- **输出**：`apps/web/src/pages/monitor/monitor-page.tsx`（ECharts 图表）、`apps/web/src/pages/topology/topology-page.tsx`（G6 画布）、对应 hooks。
- **完成判据**：
  - [ ] 监控页渲染指标快照且「无指标」降级提示正确（AC-11）
  - [ ] 拓扑页渲染 `GET /api/topology` 的节点与边，无渲染异常
  - [ ] `pnpm test` 通过；`pnpm build` 成功
- **预估工时**：0.5d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-18：前端 Subscriber/Profile/Account 三 CRUD 页平移

- **目标**：平移现有 Subscriber/Profile/Account 三模块前端（列表/新建/编辑/删除）到新控制台，数据模型不变（N3/F-8/AC-13 前端半段）。
- **AC 关联**：实现 AC-13（前端半段）
- **输入**：T-13、T-6
- **输出**：`apps/web/src/pages/subscriber/{subscriber-list,subscriber-form}.tsx`、`apps/web/src/pages/profile/*`、`apps/web/src/pages/account/*`、对应 hooks/表单校验。
- **完成判据**：
  - [ ] Subscriber/Profile/Account 三个页签可访问并完成既有 CRUD（列表/新建/编辑/删除）
  - [ ] 写操作返回 200 且持久化到 MongoDB（e2e 断言数据落库）
  - [ ] `pnpm test` 通过；`pnpm build` 成功
- **预估工时**：1d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-19：后端 e2e + 对照验证（supertest + 真实互通）

- **目标**：用 `@nestjs/testing` + supertest + mock 外呼和真实数据源，跑通 AC-1..AC-12 的端到端；用 `curl` + `systemctl is-active` 对真实网元做对照验证。
- **AC 关联**：验证全部后端 AC-1/AC-2/AC-3/AC-4/AC-5/AC-6/AC-7/AC-8/AC-9/AC-11/AC-12
- **输入**：T-7、T-8、T-9、T-10、T-11、T-12
- **输出**：`apps/server/test/{asset.e2e-spec,config.e2e-spec,lifecycle.e2e-spec,monitor.e2e-spec,topology.e2e-spec,audit.e2e-spec}.ts`；`docs/study/nms-console-e2e.md`（curl/systemctl 对照记录）。
- **完成判据**：
  - [ ] config dry-run 不落盘、dry-run=false 落盘+backup 断言成立（AC-3/AC-4）
  - [ ] lifecycle restart 触发 + 202 + 状态与 `systemctl is-active` 一致（AC-5/AC-6）
  - [ ] NRF 不可达 503、inventory 无 NRF 200、topology 节点边、metrics 快照、审计入库全部通过（AC-7/8/9/11/12）
  - [ ] `pnpm test:e2e` 通过
- **预估工时**：1d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

### T-20：前端 Playwright e2e（登录→主框架 + 资产/配置/生命周期流 + Subscriber CRUD）

- **目标**：Playwright 端到端覆盖：登录 → 主框架五模块渲染（AC-10）；资产/配置/生命周期主流程（AC-1/AC-2/AC-5/AC-6）；Subscriber CRUD 落库（AC-13）。
- **AC 关联**：验证 AC-10 / AC-13，及 AC-1/AC-2/AC-5/AC-6 前端走向
- **输入**：T-14、T-15、T-16、T-18
- **输出**：`apps/web/e2e/{login.spec,shell.spec,assets.spec,config.spec,lifecycle.spec,subscriber.spec}.ts`；Playwright 配置与 CI 任务。
- **完成判据**：
  - [ ] 登录后主框架显示五模块且无浏览器 console 报错（AC-10）
  - [ ] 资产/配置/生命周期流程断言通过（含 dry-run diff、二次确认）
  - [ ] Subscriber CRUD 完成后 Mongo DB 计数断言成立（AC-13）
  - [ ] `pnpm exec playwright test` 全绿
- **预估工时**：1d
- **责任人**：sder
- **状态**：`todo`
- **Commit**：完成后填

## 任务依赖图

```mermaid
flowchart LR
    T1[T-1 monorepo] --> T2[T-2 shared types]
    T1 --> T3[T-3 NestJS infra]
    T2 --> T3
    T1 --> T13[T-13 FE shell]
    T2 --> T13
    T3 --> T4[T-4 Mongoose data]
    T4 --> T5[T-5 auth]
    T4 --> T6[T-6 Subscriber CRUD BE]
    T5 --> T6
    T3 --> T7[T-7 asset 模块]
    T2 --> T7
    T3 --> T8[T-8 config 模块]
    T2 --> T8
    T3 --> T9[T-9 lifecycle 模块]
    T2 --> T9
    T4 --> T9
    T3 --> T10[T-10 monitor 模块]
    T3 --> T11[T-11 topology 模块]
    T2 --> T11
    T7 --> T11
    T4 --> T12[T-12 audit 查询]
    T9 --> T12
    T13 --> T14[T-14 FE asset]
    T7 --> T14
    T13 --> T15[T-15 FE config]
    T8 --> T15
    T13 --> T16[T-16 FE lifecycle]
    T9 --> T16
    T12 --> T16
    T13 --> T17[T-17 FE monitor+topology]
    T10 --> T17
    T11 --> T17
    T13 --> T18[T-18 FE Subscriber CRUD]
    T6 --> T18
    T8 --> T19[T-19 BE e2e]
    T9 --> T19
    T10 --> T19
    T11 --> T19
    T14 --> T20[T-20 FE e2e]
    T15 --> T20
    T16 --> T20
    T18 --> T20
```

## 任务模板（拷贝用）

```markdown
### T-N：<task 标题>

- **目标**：
- **AC 关联**：
- **输入**：
- **输出**：
- **完成判据**：
  - [ ]
  - [ ]
- **预估工时**：0.5d
- **责任人**：
- **状态**：`todo`
- **Commit**：
```

## 风险与变更

> 出现 `blocked` 必须在此记录原因与处理。

| 日期 | task | 事件 | 处理 |
| --- | --- | --- | --- |
| - | - | - | - |

## 完工总结（done 时填）

- 实际工时：__d
- 偏差原因：
- 最终 MR：
- 合并方式：no squash
- Task commit map：
  - T-1：
  - T-2：
  - T-3：
  - T-4：
  - T-5：
  - T-6：
  - T-7：
  - T-8：
  - T-9：
  - T-10：
  - T-11：
  - T-12：
  - T-13：
  - T-14：
  - T-15：
  - T-16：
  - T-17：
  - T-18：
  - T-19：
  - T-20：
- 沉淀到 harness 的资产：
  - 新 rule / skill / playbook：
  - 反馈到 SPEC / PLAN 的修订：
