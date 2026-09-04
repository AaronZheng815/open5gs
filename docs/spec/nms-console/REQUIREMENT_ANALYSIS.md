---
analysis_id: open5gs-nms-console
spec: SPEC.md
status: draft
owner: sder
created_at: 2026-09-04
updated_at: 2026-09-04
evidence_source:
  - codebase-kb
---

# Requirement Analysis: 网元资产发现与配置/生命周期管理（NMS Console V1）

> 本文连接"产品意图"和"实现设计"。在编写 `PLAN.md` 之前，先记录业务场景、标准证据、现有系统影响、风险和开放问题。

## 1. 需求摘要

- 产品 / 用户输入：开发网管系统目前过于简单（只有 Subscriber/Profile/Account 三个 CRUD），需要把"网元"纳入基于 Web 的管理：清点资产、查看/编辑配置、执行生命周期操作。
- 业务目标：把 16 个网元守护进程的资产、配置、生命周期统一收拢到一个 Web 控制台，替代手工 ssh + `vi` + `systemctl`。
- 目标用户：核心网开发/调试者、测试人员、网络管理员；生命周期操作对 **开发 / 测试 / 运维**角色均授权（approved Q2），场景覆盖开发/测试/运维。
- 主场景：登录 → 资产页清点网元 → 选中某网元 → 查看/编辑配置文件（dry-run diff）→ 重启网元 → 查看生命周期状态。
- 不在本次范围内：深度监控仪表盘、复杂拓扑画布、签约数据迁移、核心 3GPP 协议栈改动、多租户/SSO/生产高可用。

## 2. 范围识别

| 维度 | 识别结果 | 证据 / 理由 |
| --- | --- | --- |
| NF / module | NRF（发现）、AMF/SMF/UPF/MME 等 16 网元（资产与配置）、NMS 后端聚合层 | 管理面；消费既有 SBI/metrics/infoAPI |
| Interface | SBI（NRF Discovery）、`:9090/metrics`、Info API（`/pdu-info` `/gnb-info` `/ue-info`）、配置文件、systemd | EV-001/EV-003/EV-004/EV-005/EV-006 |
| Procedure | NF 注册发现、配置读改写、服务启停/重启/重载 | 管理面编排，非 3GPP 流程本身 |
| Message / API | GET /api/nfs、GET/POST /api/nfs/{id}/config、POST /api/nfs/{id}/lifecycle、GET /api/inventory、GET /api/topology、GET /api/metrics/{nf}/snapshot | NMS 自定义 REST |
| Data model | NF 资产模型、配置 JSON、diff 结果、生命周期状态 | 驱动自 NFProfile / yaml / systemd 状态 |
| Release / version | Open5GS 2.8.0（SBI 走 TS 29.510 面向 3GPP v17 语义；OGS 私有配置格式） | baseline-analysis.md |

## 3. 标准证据

| Evidence ID | Source | Locator | Type | 摘要 | Confidence |
| --- | --- | --- | --- | --- | --- |
| EV-001 | TS 29.510 | §NF Discovery / §NF Management | sbi_api | NRF 提供 `nnrf-disc/v1/nf-instances` 发现与被注册的 NF Profile（nfType、nfInstanceId、SBI 端点） | exact |
| EV-002 | TS 29.571 | Common Data Types | schema | 5GC 通用数据结构（NFProfile、ProblemDetails）约定 NMS 资产模型公共字段 | exact |
| EV-003 | codebase-kb | docs/_docs/tutorial/07-infoAPI-UE-gNB-session-data.md | endpoint | `/pdu-info` `/gnb-info` `/ue-info` `/enb-info` 为 OGS 内嵌 `:9090` JSON，带 pager | codebase |
| EV-004 | codebase-kb | docs/_docs/tutorial/04-metrics-prometheus.md | endpoint | AMF/SMF/MME 输出 Prometheus `:9090/metrics` | codebase |
| EV-005 | codebase-kb | configs/open5gs/*.yaml.in + baseline §4 地址表 | config | 各网元 yaml 模板 + 回环地址/角色映射，构成资产与配置主表 | codebase |
| EV-006 | codebase-kb | configs/systemd/*.service + `open5gs-<nf>d` | procedure | 生命周期操作通过 systemd 服务单元编排 | codebase |

## 4. 协议影响矩阵

| Evidence ID | NF / module | Interface | Message / API | Data model | 预期影响 |
| --- | --- | --- | --- | --- | --- |
| EV-001 | NRF | SBI | `/nnrf-disc/v1/nf-instances` | NF Profile 列表 | 映射为 NMS `GET /api/nfs` 资产清单与在线状态 |
| EV-002 | NMS 后端 | REST | `GET /api/nfs` 响应 | 资产模型（nfType/id/sbi/status） | 统一资产字段命名与错误骨架 |
| EV-003 | AMF/SMF/MME | `:9090` | `/gnb-info` `/ue-info` `/pdu-info` `/enb-info` | JSON items + pager | 为监控子 Spec 预留；V1 仅做快照读取 |
| EV-004 | AMF/SMF/MME | `:9090` | `/metrics` | Prometheus text | `GET /api/metrics/{nf}/snapshot` 解析关键指标 |
| EV-005 | 各网元 | config file | `configs/open5gs/*.yaml` | 结构化 yaml→JSON | `GET/POST /api/nfs/{id}/config`、diff、dry-run |
| EV-006 | 各网元 | systemd | `open5gs-<nf>d.service` | unit 状态 | `POST /api/nfs/{id}/lifecycle/*`、`GET .../lifecycle` |

## 5. 现有系统影响

| 范围 | 当前行为 / 资产 | 需要变更 | Evidence |
| --- | --- | --- | --- |
| Code module | `webui/server/*`（Express + mongoose，Subscriber/Profile/Account CRUD） | **不改**现有代码；新增独立 NMS 后端聚合层，复用 Mongo 连接 | EV-005 |
| Code module | `configs/open5gs/*.yaml.in` | 作为**只读**资产/配置来源；可写回运行时配置文件 | EV-005 |
| Code module | `configs/systemd/*` + `open5gs-<nf>d` systemd 单元 | 作为生命周期编排目标；不触碰核心源码 | EV-006 |
| Spec / ADR | `docs/study/open5gs-baseline-analysis.md`（基线快照） | 引用其 §3 接口表 / §4 地址表作为资产与拓扑数据来源 | EV-005 |
| Test assets | `src/*/` 功能测试（attach/registration 等） | 不新增重量级协议测试；重点为 NMS 后端聚合层 + 前端渲染测试 | EV-001 |
| Code module | `webui/` 前端（Next3/React15） | 被替换 / 并存为 React18+TS+Vite 新控制台 | Q1 |

## 6. 测试与互通关注点

| 关注点 | 场景 | 预期验证 |
| --- | --- | --- |
| Unit | yaml 解析 / diff 生成 / metric text 解析 | 单元测试断言字段与 diff 结构 |
| Integration | NMS 后端 ↔ NRF（mock 与真实）、↔ 配置文件、↔ systemd | `GET /api/nfs` 200 / 503、config dry-run 不落盘、lifecycle 状态一致 |
| Interop | 与 `:9090` metric / info API 的真实网元互通 | 快照解析成功、pager 语义正确 |
| Regression | 现有 subscriber webui 登录/CRUD | 新控制台独立端口，回归冒烟不破坏 |
| Lifecycle | systemctl restart 触发 + 二次确认 + 备份 + 审计 | 状态回读 = `systemctl is-active` |

## 7. 风险与缓解

| 风险 | 等级 | 缓解策略 | Owner |
| --- | --- | --- | --- |
| NRF 发现与本地清单不一致 | medium | 本地清单为资产主表、NRF 在线叠加；差值标记 | Dev |
| 生命周期操作影响运行中网元 | high | 二次确认 + dry-run 预览 + 配置备份 + 审计 + 可回滚 | Tech Lead |
| 旧 webui 与新控制台依赖冲突 | medium | 独立 app 与端口、独立依赖树、复用 Mongo | Dev |
| 网元 `:9090` 仅 AMF/SMF/MME 开启 | low | 指标快照按可用性降级，前端标注"无指标" | Dev |
| OGS 私有 yaml 跨版本变化 | medium | 只读解析 + 保留结构；版本差异入开放问题 | Dev |

## 8. 开放问题

| ID | 问题 | Owner | Due | Blocking |
| --- | --- | --- | --- | --- |
| Q3 | 配置写回时对 yaml 注释与手写片段的保留策略？ | sder | 2026-09-18 | no |
| Q4 | 监控/拓扑子 Spec 的数据源接口是否需在本期预留统一聚合端点？ | sder | 2026-09-25 | no |

**已解决（approved 2026-09-04）**：Q1（替换，Subscriber/Profile/Account 平移到新栈）、Q2（开发/测试/运维均可执行生命周期）、Q5（不拆分，合并为单一 nms-console Spec）。

## 9. 交接给 Plan

- Plan 必须引用的 Evidence IDs：EV-001（NRF 发现）、EV-004（metrics）、EV-005（配置清单）、EV-006（systemd 生命周期）。
- 必须引用 Evidence 的关键设计决策：
  1. 资产主表以本地配置清单为根（EV-005），NRF 只做在线叠加（EV-001）。
  2. 配置读改写走 yaml→JSON→yaml，dry-run 不落盘（EV-005）。
  3. 生命周期操作走 systemd 并加二次确认 + 备份 + 审计（EV-006）。
  4. 指标为快照模式依赖 `:9090`（EV-004），统一聚合端点给后续子 Spec 预留（Q4）。
- Plan 约束：不改核心 C 源码；新控制台**替换**现有 webui（Subscriber/Profile/Account 平移到新栈，数据模型不变）；生命周期授权覆盖开发/测试/运维；登录复用现有 Account。
- 缺 Evidence 时必须保留为风险 / 开放问题的事项：yaml 注释保留策略（Q3）、监控/拓扑统一端点（Q4）。

## 10. 变更历史

| 版本 | 日期 | 变更 | 作者 |
| --- | --- | --- | --- |
| v0.1 | 2026-09-04 | initial draft | sder |
| v0.2 | 2026-09-04 | 折入 Q1=替换、Q2=开发/测试/运维均可、Q5=不拆分；更新 §1/§8/§9 | sder |
