# AGENTS.md

> 给 AI Agent 阅读的项目入口。

## 团队 Harness

本仓库接入 `xwy-harness-engineering`（路径 `.harness/`）。AI 工作时必须读取：

- 方法论: `.harness/methodology/SDD.md`
- 团队 Rules: `.harness/rules/`（已链接到 `.cursor/rules/`）
- 团队 Skills: `.harness/skills/`（已链接到 `.claude/skills/`）
- Spec / Requirement Analysis / Plan / Tasks 模板: `.harness/templates/`

## 本仓库特有约束

- 业务领域: core-network
- 接入后请补充关键依赖、性能 baseline 和协议版本。

## SDD 工作流

新特性遵循 SDD: Specify → Requirement Analysis → Plan → Tasks → Implement。
Spec 资产存放: `docs/spec/<feature-kebab>/`
