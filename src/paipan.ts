// 排盘纯函数
// 单一测试 seam：输入钟表时出生时刻，返回年柱 + 日柱
// 遵循 ADR-0001（年柱按立春切换）、ADR-0002（日界线在子正）

import { 六十甲子 } from "./ganzhi.js";
import { getLichunMoment } from "./jieqi.js";

/** 排盘输入：公历年月日 + 时分（钟表时，北京时间 UTC+8） */
export interface 排盘Input {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** 排盘输出 - T2 阶段含年柱 + 日柱 */
export interface 排盘Result {
  年柱: string;
  日柱: string;
}

// 锚点：2000-01-01 日柱为戊午，六十甲子序号 54（甲子=0）
// 真值来源：Deep Oracle 排盘 https://www.deeporacle.ai/zh-TW/bazi/chart/2000/1/1
const DAY_PILLAR_ANCHOR_YEAR = 2000;
const DAY_PILLAR_ANCHOR_MONTH = 1; // 1 月
const DAY_PILLAR_ANCHOR_DAY = 1;
const DAY_PILLAR_ANCHOR_INDEX = 54;

/** 北京时间 UTC+8 偏移（毫秒） */
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 计算从锚点日期到目标日期的天数差（目标 - 锚点） */
function daysSinceAnchor(year: number, month: number, day: number): number {
  // Date.UTC 第二参 monthIndex 从 0 起 -- 月需要 -1
  const target = Date.UTC(year, month - 1, day);
  const anchor = Date.UTC(
    DAY_PILLAR_ANCHOR_YEAR,
    DAY_PILLAR_ANCHOR_MONTH - 1,
    DAY_PILLAR_ANCHOR_DAY,
  );
  return Math.round((target - anchor) / 86_400_000);
}

/** 把钟表时（北京时间）的年月日时分转为 UTC 毫秒时间戳 */
function clockTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number {
  return Date.UTC(year, month - 1, day, hour, minute) - BEIJING_OFFSET_MS;
}

/**
 * 年柱计算：年柱在交立春那一刻切换（ADR-0001）。
 * 立春前出生归上一公历年的干支年；立春后（含）出生归本公历年的干支年。
 * 干支年序号 = (公历年 - 4) mod 60（甲子=0）。
 */
function computeYearPillar(input: 排盘Input): string {
  const birthUtc = clockTimeToUtcMs(
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
  );
  const lichunUtc = getLichunMoment(input.year);
  // 出生在立春之前 -> 归上一公历年
  const ganzhiYear = birthUtc < lichunUtc ? input.year - 1 : input.year;
  const index = (((ganzhiYear - 4) % 60) + 60) % 60;
  return 六十甲子(index);
}

/**
 * 排盘纯函数。
 * T2：返回年柱 + 日柱。
 * - 年柱按立春切换（ADR-0001）
 * - 日柱按公历日，日界线在子正（00:00）；23:59 仍属当日，次日 00:00 切为新日柱
 */
export function 排盘(input: 排盘Input): 排盘Result {
  const offset = daysSinceAnchor(input.year, input.month, input.day);
  return {
    年柱: computeYearPillar(input),
    日柱: 六十甲子(DAY_PILLAR_ANCHOR_INDEX + offset),
  };
}
