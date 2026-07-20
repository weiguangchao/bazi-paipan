// 排盘纯函数 - T1 只实现日柱
// 单一测试 seam：输入钟表时出生时刻，返回日柱
// 遵循 ADR-0002：日界线在子正（00:00），23:59 仍属当日

import { 六十甲子 } from "./ganzhi.js";

/** 排盘输入：公历年月日 + 时分（钟表时，北京时间） */
export interface 排盘Input {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** 排盘输出 - T1 阶段仅含日柱 */
export interface 排盘Result {
  日柱: string;
}

// 锚点：2000-01-01 日柱为戊午，六十甲子序号 54（甲子=0）
// 真值来源：Deep Oracle 排盘 https://www.deeporacle.ai/zh-TW/bazi/chart/2000/1/1
const DAY_PILLAR_ANCHOR_YEAR = 2000;
const DAY_PILLAR_ANCHOR_MONTH = 1; // 1 月
const DAY_PILLAR_ANCHOR_DAY = 1;
const DAY_PILLAR_ANCHOR_INDEX = 54;

/** 计算从锚点日期到目标日期的天数差（目标 - 锚点） */
function daysSinceAnchor(year: number, month: number, day: number): number {
  // Date.UTC 第二参 monthIndex 从 0 起 —— 月需要 -1
  const target = Date.UTC(year, month - 1, day);
  const anchor = Date.UTC(
    DAY_PILLAR_ANCHOR_YEAR,
    DAY_PILLAR_ANCHOR_MONTH - 1,
    DAY_PILLAR_ANCHOR_DAY,
  );
  return Math.round((target - anchor) / 86_400_000);
}

/**
 * 排盘纯函数。
 * T1：仅返回日柱。
 * 日界线在子正（00:00）—— 时分不参与日柱计算（时分留给时柱），
 * 日柱完全由年月日决定；23:59 与次日 00:00 落在不同公历日，故日柱不同。
 */
export function 排盘(input: 排盘Input): 排盘Result {
  const offset = daysSinceAnchor(input.year, input.month, input.day);
  return { 日柱: 六十甲子(DAY_PILLAR_ANCHOR_INDEX + offset) };
}
