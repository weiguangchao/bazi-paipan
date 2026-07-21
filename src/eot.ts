// 均时差（Equation of Time）纯函数模块
// 词汇遵循 CONTEXT.md：均时差 = 视太阳时 − 平太阳时，随 UTC 日期变化，与经度无关。
// 源于地球椭圆轨道与自转轴倾角。按出生 UTC 日期计算，函数无副作用、不读时钟。
// 本模块是排盘采纳真太阳时（视太阳时）的计算核心，不触碰排盘层（见 #13/#14）。

/** 一回归年近似天数，用于把积日映射到周年相位。NOAA 简化式采用 365。 */
const DAYS_PER_YEAR = 365;

/** NOAA 简化式相位偏移：B = 2π/365·(N − 81)。81 对应春分附近积日。 */
const PHASE_OFFSET_DAYS = 81;

/**
 * 均时差：视太阳时与平太阳时之差（分钟）。
 *
 * 输入为出生 UTC 毫秒时间戳；输出分钟数，可为负、为分数。
 * 按 UTC 日期计算，与经度无关（同一 UTC 时刻全球均时差相同）。
 *
 * 采用 NOAA 简化式（自实现，无第三方天文库依赖）：
 *   B   = 2π / 365 · (N − 81)
 *   EoT = 9.87·sin(2B) − 7.53·cos(B) − 1.5·sin(B)  （分钟）
 * 其中 N 为自当年 1 月 1 日 00:00 UTC 起的积日（含日内小数）。
 *
 * 该式源于对地球轨道偏心率与黄赤交角两项贡献的三角级数拟合，
 * 全年误差通常在 ±1 分以内，足以支撑排盘的时辰归属判定。
 *
 * 锚点：2 月中 ≈ −14 分、11 月初 ≈ +16 分；零点约 4 月中、6 月中、9 月初、12 月底。
 */
export function 均时差分钟数(utcMs: number): number {
  const { dayOfYear, fractionOfDay } = toUtcDayOfYear(utcMs);
  const n = dayOfYear + fractionOfDay;
  const b = (2 * Math.PI / DAYS_PER_YEAR) * (n - PHASE_OFFSET_DAYS);
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * 把 UTC 毫秒时间戳分解为当年积日（整数，1 起）与日内小数（[0,1)）。
 * 用 UTC 字段计算，不受本地时区影响。
 *
 * 返回的积日按当年 1 月 1 日 00:00 UTC 为第 1 天计；日内小数为
 * (时 + 分/60 + 秒/3600) / 24，使均时差随日内时刻连续变化。
 */
function toUtcDayOfYear(utcMs: number): { dayOfYear: number; fractionOfDay: number } {
  const d = new Date(utcMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-11
  const day = d.getUTCDate(); // 1-31
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const second = d.getUTCSeconds();

  // 当年 1 月 1 日 00:00 UTC 的毫秒时间戳
  const yearStart = Date.UTC(year, 0, 1, 0, 0, 0);
  // 目标日 00:00 UTC 的毫秒时间戳
  const dayStart = Date.UTC(year, month, day, 0, 0, 0);
  // 积日：yearStart 到 dayStart 的整天数 + 1（1 月 1 日为第 1 天）
  const dayOfYear = Math.round((dayStart - yearStart) / 86_400_000) + 1;

  const fractionOfDay = (hour + minute / 60 + second / 3600) / 24;

  return { dayOfYear, fractionOfDay };
}
