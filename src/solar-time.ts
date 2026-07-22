// 真太阳时与经度修正 - 纯函数，排盘的输入预处理。
// 词汇遵循 CONTEXT.md：钟表时、经度修正、均时差、平太阳时、真太阳时。
// 钟表时即用户输入的北京时间（UTC+8）。
// 平太阳时 = 钟表时 + 经度修正（不含均时差，代表匀速平太阳层级）。
// 真太阳时 = 钟表时 + 经度修正 + 均时差（视太阳过当地子午线的时刻，传统八字采用）。

import { equationOfTimeMinutes } from "./eot.js";

/** 经度修正中枢线（钟表时所对应的东八区中央经线）。120°E。 */
export const referenceLongitude = 120;

/** 每度经度对应的分钟差，真太阳时与钟表时之差的换算系数。4 分钟/度。 */
export const minutesPerDegree = 4;

/**
 * 经度修正：由出生地经度算出平太阳时相对钟表时的分钟偏移。
 * 东经 > 120° -> 正偏移（偏东地区真太阳时比钟表时更晚，故加分）；
 * 东经 < 120° -> 负偏移。
 * 返回分钟数（可为分数，排盘时分映射由调用方决定如何使用）。
 */
export function longitudeCorrectionMinutes(longitude: number): number {
  return (longitude - referenceLongitude) * minutesPerDegree;
}

/**
 * 把钟表时出生时刻（北京时间 UTC+8）按经度修正为平太阳时出生时刻。
 * 平太阳时不含均时差（CONTEXT.md：平太阳时 = 钟表时 + 经度修正）。
 * 输入是 UTC 毫秒时间戳；输出也是 UTC 毫秒时间戳（平太阳时是本地太阳时，仍按
 * 北京时间日期分解来对比干支切换点，故只做平移、不改时区）。
 */
export function applyLongitudeCorrection(birthClockUtcMs: number, longitude: number): number {
  const minutes = longitudeCorrectionMinutes(longitude);
  return birthClockUtcMs + minutes * 60_000;
}

/**
 * 真太阳时相对钟表时的总分钟偏移 = 经度修正 + 均时差（CONTEXT.md）。
 * 均时差在出生 UTC 时刻求值，与经度无关。
 * 返回分钟数（可为负、为分数）。
 */
export function trueSolarTimeOffsetMinutes(birthClockUtcMs: number, longitude: number): number {
  return longitudeCorrectionMinutes(longitude) + equationOfTimeMinutes(birthClockUtcMs);
}

/**
 * 把钟表时出生时刻按经度修正 + 均时差合成为真太阳时出生时刻（视太阳时）。
 * 真太阳时 = 钟表时 + 经度修正 + 均时差，均时差在出生 UTC 时刻求值。
 * 输入/输出均为 UTC 毫秒时间戳（真太阳时是本地太阳时，仍按北京时间日期分解
 * 来对比干支切换点，故只做平移、不改时区）。
 */
export function applyTrueSolarTime(birthClockUtcMs: number, longitude: number): number {
  return birthClockUtcMs + trueSolarTimeOffsetMinutes(birthClockUtcMs, longitude) * 60_000;
}
