# AGENTS.md

## Agent skills

### Issue tracker

问题（含 PRD 与 ticket）存放在仓库的 GitHub Issues，使用 `gh` CLI 进行所有操作；PR 不作为 triage 面。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用五个规范 triage 角色的默认标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文（single-context）布局：`CONTEXT.md` 与 `docs/adr/` 位于仓库根。详见 `docs/agents/domain.md`。

## Git commit

- 提交信息：`<type>(<scope>): <description>`
- type：常量，feat / fix / docs / test / chore / refactor / perf / build / ci / revert
- scope：模块名（可选），英文
- description：中文，精简、技术名词保留英文，禁止模糊描述
