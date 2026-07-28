# AGENTS.md

- 使用中文同我交流

## Project structure

```text
.
├── AGENTS.md          # agent 工作流规则（本文件）
├── CONTEXT.md         # 命理术语表与规范 token
├── index.html         # Vite 入口
├── package.json
├── tsconfig.json
├── vite.config.ts
├── content/           # 命理古籍原文与分章内容
├── docs/
│   ├── adr/           # 架构决策记录
│   └── agents/        # agent 工作流细则
├── src/
│   ├── domain/        # 命理核心：birth / ganzhi / paipan / time
│   ├── components/    # React 组件：paipan-form / paipan-result / ui
│   ├── pages/         # 页面与 URL 参数
│   ├── data/          # 生成数据 cities.generated.ts
│   ├── lib/           # 通用工具
│   └── utils/         # beijing-time / wuxing
├── scripts/           # 数据生成与标识符检查脚本
└── test/              # Vitest 测试
```

## Agent skills

### Issue tracker

问题（含 PRD 与 ticket）存放在仓库的 GitHub Issues，使用 `gh` CLI 进行所有操作；PR 不作为 triage 面。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用五个规范 triage 角色的默认标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文（single-context）布局：`CONTEXT.md` 与 `docs/adr/` 位于仓库根。详见 `docs/agents/domain.md`。

修改手写可执行代码前必须先读 `CONTEXT.md`。通用概念使用英文，命理概念使用其中定义的完整规范 token；禁止引入别名或拆分拼音。确需新增命理术语时，先更新 `CONTEXT.md`，再用于代码命名。

## Git commit

- subject：`<type>: <description>`
- type：常量，feat / fix / docs / test / chore / refactor / perf / build / ci / revert
- 在实现 issue 时，在 subject 末尾使用 issue 编号，如 `feat: demo commit (#1)`
- description：使用中文，内容精简，技术名词保留英文，禁止模糊描述
