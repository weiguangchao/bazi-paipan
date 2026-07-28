---
status: amended by ADR-0006
---

# 流年、流月使用独立纯函数，命盘不读时钟

流年序列由独立纯函数 `liunian(起始公历年)` 产出，流月序列由独立纯函数 `liuyue(所属流年公历年, 当前 BeijingDateTime)` 产出；两者都不注入 `PaipanInput`、不进 `PaipanResult`。

当前应用是 Vite 纯前端调用链。浏览器边缘在用户点击“排盘”时一次读取完整当前时刻，构造北京时间公历年月与 `BeijingDateTime` 并注入 `mingpan`。`mingpan` 为每步大运组装连续十个大运关联流年，为每个流年组装十二个流月，并分别标记当前大运、今年与当前流月。`paipan`、`mingpan`、`liunian` 与 `liuyue` 都不直接读取系统时钟。

干支换算只依赖给定公历年，当前流月只依赖注入时刻与准确交节区间。将展示所需的大运关联流年和流月塞进 `paipan` 会让排盘核心承担命盘展示组装；让领域函数读取 `Date.now()` 则会破坏纯度。被否的两套仍是：把当前时刻注入 `PaipanInput`，或在任一领域函数内部直接读取时钟。
