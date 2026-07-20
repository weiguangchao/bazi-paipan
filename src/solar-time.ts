// 真太阳时与经度修正 - 纯函数，排盘的输入预处理。
// 词汇遵循 CONTEXT.md：钟表时、真太阳时、经度修正。
// 钟表时即用户输入的北京时间（UTC+8）；真太阳时 = 钟表时 + (经度 − 120°) × 4 分钟/度。

/** 经度修正中枢线（钟表时所对应的东八区中央经线）。120°E。 */
export const 参考经度 = 120;

/** 每度经度对应的分钟差，真太阳时与钟表时之差的换算系数。4 分钟/度。 */
export const 每度分钟数 = 4;

/**
 * 经度修正：由出生地经度算出真太阳时相对钟表时的分钟偏移。
 * 东经 > 120° -> 正偏移（偏东地区真太阳时比钟表时更晚，故加分）；
 * 东经 < 120° -> 负偏移。
 * 返回分钟数（可为分数，排盘时分映射由调用方决定如何使用）。
 */
export function 经度修正分钟数(longitude: number): number {
  return (longitude - 参考经度) * 每度分钟数;
}

/**
 * 把钟表时出生时刻（北京时间 UTC+8）按经度修正为真太阳时出生时刻。
 * 输入是 UTC 毫秒时间戳；输出也是 UTC 毫秒时间戳（真太阳时是本地太阳时，仍按
 * 北京时间日期分解来对比干支切换点，故只做平移、不改时区）。
 */
export function 应用经度修正(birthClockUtcMs: number, longitude: number): number {
  const minutes = 经度修正分钟数(longitude);
  return birthClockUtcMs + minutes * 60_000;
}