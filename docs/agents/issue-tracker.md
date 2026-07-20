# Issue tracker: GitHub

本仓库的 issue 与 PRD 均存放在 GitHub Issues。所有操作经 `gh` CLI 完成。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **读 issue**：`gh issue view <number> --comments`，按需用 `jq` 过滤评论、附带取 labels。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，按需加 `--label` / `--state` 过滤。
- **评论 issue**：`gh issue comment <number> --body "..."`。
- **增减 label**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`。
- **关闭**：`gh issue close <number> --comment "..."`。

仓库由 `git remote -v` 推断——在 clone 内 `gh` 会自动识别。

## Pull requests as a triage surface

**PRs as a request surface: no.** _(若本仓库把外部 PR 视作需求来源，则改为 `yes`；`/triage` 会读取此标志。)_

设为 `yes` 时，PR 与 issue 走同一套 label 与状态，使用 `gh pr` 对应命令：

- **读 PR**：`gh pr view <number> --comments`，并 `gh pr diff <number>` 取 diff。
- **为 triage 列外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE`（剔除 `OWNER` / `MEMBER` / `COLLABORATOR`）。
- **评论 / label / 关闭**：`gh pr comment`、`gh pr edit --add-label` / `--remove-label`、`gh pr close`。

GitHub issue 与 PR 共用一个编号空间，裸 `#42` 可能是任一——用 `gh pr view 42` 判别，退守 `gh issue view 42`。

## 当技能说 "publish to the issue tracker"

创建一个 GitHub issue。

## 当技能说 "fetch the relevant ticket"

执行 `gh issue view <number> --comments`。

## Wayfinding operations

供 `/wayfinder` 使用。**map** 是单个 issue，其 **child** issue 作为 ticket。

- **Map**：单个打 `wayfinder:map` label 的 issue，持有 Notes / Decisions-so-far / Fog 正文。`gh issue create --label wayfinder:map`。
- **Child ticket**：作为 GitHub sub-issue 关联到 map（用 `gh api` 调 sub-issues 端点）。若 sub-issue 未启用，则在 map 正文加 task list 列出 child，并在 child 正文顶端写 `Part of #<map>`。Labels：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。被认领后 assign 给驱动的 dev。
- **Blocking**：用 GitHub **原生 issue 依赖关系**——UI 可见的标准表示。加一条边：`gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`，其中 `<blocker-db-id>` 是 blocker 的数字 **database id**（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`，_不是_ `#number` 或 `node_id`）。GitHub 在 `issue_dependencies_summary.blocked_by` 中回报（仅 open 的 blocker——即活的门禁）。若依赖项不可用，退守在 child 正文顶端写 `Blocked by: #<n>, #<n>` 一行。当所有 blocker 关闭时 ticket 解除阻塞。
- **Frontier query**：列出 map 的 open child（`gh issue list --state open`，按 map 的 sub-issue / task list 圈定），剔除任何带 open blocker（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 行里有 open issue）或有 assignee 的；按 map 内顺序取第一个。
- **Claim**（认领）：`gh issue edit <n> --add-assignee @me`——会话的第一次写操作。
- **Resolve**（解决）：`gh issue comment <n> --body "<answer>"`，随后 `gh issue close <n>`，再向 map 的 Decisions-so-far 追加一条上下文指针（gist + 链接）。