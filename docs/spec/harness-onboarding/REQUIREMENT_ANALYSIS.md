---
analysis_id: open5gs-harness-onboarding
spec: SPEC.md
status: draft
owner: sder
created_at: 2026-09-04
updated_at: 2026-09-04
evidence_source:
  - codebase-kb
---

# Requirement Analysis: Open5GS 接入 xwy-harness-engineering

> 本文连接"产品意图"和"实现设计"。在编写 `PLAN.md` 之前，先记录业务场景、标准依据、现有系统影响、风险和开放问题。

## 1. 需求摘要

- 产品 / 用户输入：把 Open5GS 业务仓库接入团队 AI 工程 harness。
- 业务目标：复用团队 SDD 方法论、Rules、Skills 与消费仓质量门禁。
- 目标用户或运维角色：Open5GS 开发者、Tech Lead。
- 主场景：在仓库根目录执行 install-harness.sh，获得 `.harness` submodule 与入口资产。
- 不在本次范围内：不修改 Open5GS 的任何业务逻辑。

## 2. 范围识别

| 维度 | 识别结果 | 证据 / 理由 |
| --- | --- | --- |
| NF / module | 仓库级脚手架（非 NF） | harness 接入针对整个仓库，而非单个 NF |
| Interface | Git submodule + 相对软链 | 接入以仓库为边界 |
| Procedure | harness onboarding | 遵循 onboarding/project-onboarding.md |
| Message / API | install-harness.sh / consumer-quality-gate.sh | 两者是接入与门禁入口 |
| Data model | 无（不改数据模型） | 不涉及协议数据模型 |
| Release / version | v0.3.1 | owner 决定升级到最新 tag 并验证 |

## 3. 标准证据

| Evidence ID | Source | Locator | Type | 摘要 | Confidence |
| --- | --- | --- | --- | --- | --- |
| EV-001 | onboarding-doc | onboarding/project-onboarding.md | procedure | 以固定 ref 的 submodule 接入 harness | exact |
| EV-002 | install-script | onboarding/scripts/install-harness.sh | tool | --as-submodule --domain core-network | exact |
| EV-003 | quality-gate | scripts/consumer-quality-gate.sh | tool | 校验 pin / sdd / ignore / trace | exact |

## 4. 协议影响矩阵

| Evidence ID | NF / module | Interface | Message / API | Data model | 预期影响 |
| --- | --- | --- | --- | --- | --- |
| EV-001 | repo-root | submodule | git submodule add .harness | .gitmodules | 新增 .harness 记录 |
| EV-002 | repo-root | cli | install-harness.sh | 软链文件 | 生成 rules/skills 软链 |
| EV-003 | repo-root | gate | consumer-quality-gate.sh | 报告 | 输出 PASS 摘要 |

## 5. 现有系统影响

| 范围 | 当前行为 / 资产 | 需要变更 | Evidence |
| --- | --- | --- | --- |
| Code module | 无 harness 相关目录 | 新增 `.harness`/`.cursor`/`.claude` | EV-001 / EV-002 |
| Spec / ADR | 无 `docs/spec` | 新增 `docs/spec/harness-onboarding` | EV-001 |
| Test assets | 无门禁 | 新增消费仓质量门禁 | EV-003 |

## 6. 测试与互通关注点

| 关注点 | 场景 | 预期验证 |
| --- | --- | --- |
| Unit | 门禁脚本字段校验 | validate-sdd.sh / check-sdd-state.sh 返回 0 |
| Integration | submodule 固定 ref | git submodule status 显示 v0.3.1 |
| Interop | 软链指向 harness | ls -l 显示相对链接 |
| Regression | 仓库原有业务代码 | 执行仓库自身 build 不受影响 |

## 7. 风险与缓解

| 风险 | 等级 | 缓解策略 | Owner |
| --- | --- | --- | --- |
| 代理环境变量干扰 git | 低 | 去代理 env 运行接入与门禁 | sder |
| submodule 语料体积大 | 中 | 仅作 submodule，不复制历史 | sder |

## 8. 开放问题

| ID | 问题 | Owner | Due | Blocking |
| --- | --- | --- | --- | --- |
| Q1 | CI 门禁在 GitHub/GitLab 上如何落地 | sder | 2026-09-11 | no |

## 9. 交接给 Plan

- Plan 必须引用的 Evidence IDs：EV-001、EV-002、EV-003。
- 必须引用 Evidence 的关键设计决策：固定 ref 的 submodule（EV-001）；软链与 ignore 由脚本生成（EV-002）。
- Plan 约束：不动业务逻辑；门禁命令去代理执行。
- 缺 Evidence 时必须保留为风险 / 开放问题的事项：CI 落地未定，保留为 Q1。

## 10. 变更历史

| 版本 | 日期 | 变更 | 作者 |
| --- | --- | --- | --- |
| v0.1 | 2026-09-04 | initial draft | sder |
