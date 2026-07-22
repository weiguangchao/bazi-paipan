# 流年序列使用独立纯函数，排盘不读时钟

流年序列由独立纯函数 `liunian(起始公历年)` 产出，不注入 `PaipanInput`、不进 `PaipanResult`。Web API 为每步大运以其起运公历年调用该函数，组装连续十个大运关联流年，并在 API 边缘按北京时间读取今年以标记 `isCurrentYear`。`paipan` 核心保持无时钟、纯函数不变。

干支换算只依赖给定公历年；将大运关联流年塞进 `paipan` 会让领域核心承担 API 展示组装，让 `paipan` 读取 `Date.now()` 还会破坏纯度。被否的两套仍是：把 `参考时刻` 注入 `PaipanInput`，或在 `paipan` 内部直接读取时钟。
