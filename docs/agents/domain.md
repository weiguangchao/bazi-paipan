# Domain Docs

工程技能在探查代码库前应如何消费本仓库的领域文档。

## 探查前先读

- 仓库根的 **`CONTEXT.md`**；或
- 若根有 **`CONTEXT-MAP.md`**，按其指向读相关上下文的 `CONTEXT.md`。
- **`docs/adr/`**——读触及你即将改动区域的 ADR。多上下文仓库另查 `src/<context>/docs/adr/` 的上下文级决策。

若上述任一文件不存在，**静默继续**。不要提示其缺失，不要建议预先创建。`/domain-modeling`（经 `/grill-with-docs` 与 `/improve-codebase-architecture` 触达）只在实际敲定术语或决策时才惰性创建它们。

## 文件结构

单上下文仓库（多数仓库）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文仓库（根存在 `CONTEXT-MAP.md`）：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 上下文级决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用统一语言的词汇

当你的输出命名一个领域概念（issue 标题、重构提案、假设、测试名）时，用 `CONTEXT.md` 中定义的术语。不要漂移到该统一语言明确规避的同义词。

若你需要的概念尚不在其中，这是个信号——要么你在发明本项目不用的语言（重新考虑），要么是真实缺口（向 `/domain-modeling` 标注）。

## 标注 ADR 冲突

若你的输出与某条 ADR 相悖，明确标注出来，而非默默覆盖：

> _与 ADR-0007（event-sourced orders）相悖——但值得重开，因为……_