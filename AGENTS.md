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
- 常用类型：feat / fix / docs / test / chore / refactor / perf / build / ci / revert
- 提交语言优先遵循项目现有 Commit、README
- pr 编号保留在 subject 末尾：`(#60)`
- issue 编号保留在 scope：`feat(#60)`
