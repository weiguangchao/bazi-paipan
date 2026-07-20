// 排盘纯函数
// 单一测试 seam：输入钟表时出生时刻，返回年柱 + 月柱 + 日柱
// 遵循 ADR-0001（年柱按立春切换、月柱按节切换）、ADR-0002（日界线在子正）

import { 六十甲子, 天干, 地支 } from "./ganzhi.js";
import { getLichunMoment, getSolarTermMoment } from "./jieqi.js";

/** 排盘输入：公历年月日 + 时分（钟表时，北京时间 UTC+8） */
export interface 排盘Input {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** 排盘输出 - T3 阶段含年柱 + 月柱 + 日柱 */
export interface 排盘Result {
  年柱: string;
  月柱: string;
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

// 节（非中气）交节后对应的月地支序：从立春起为寅月，顺排到小寒为丑月。
// 节序号采用 SOLAR_TERM_NAMES 顺序：3=立春、5=惊蛰、7=清明、9=立夏、11=芒种、
// 13=小暑、15=立秋、17=白露、19=寒露、21=立冬、23=大雪、1=小寒。
const JIE_TERM_INDEXES = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 1] as const;
// 对应月地支序号（子=0、丑=1、寅=2…亥=11）：立春->寅(2)、惊蛰->卯(3)…小寒->丑(1)
const JIE_MONTH_ZHI_INDEX = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1] as const;

/**
 * 五虎遁：由年干推出寅月天干（起月诀）。
 * 甲己丙作首、乙庚戊为头、丙辛庚起、丁壬壬起、戊癸甲起。
 * 返回寅月天干序号（0=甲…9=癸）。
 */
function yinMonthGanIndex(yearGanIndex: number): number {
  // 起点偏移：甲/己->丙(2)、乙/庚->戊(4)、丙/辛->庚(6)、丁/壬->壬(8)、戊/癸->甲(0)
  return [2, 4, 6, 8, 0][yearGanIndex % 5]!;
}

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

/** 将排盘输入的出生时刻转为 UTC 毫秒时间戳 */
function inputToUtcMs(input: 排盘Input): number {
  return clockTimeToUtcMs(
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
  );
}

/**
 * 年柱计算：年柱在交立春那一刻切换（ADR-0001）。
 * 立春前出生归上一公历年的干支年；立春后（含）出生归本公历年的干支年。
 * 干支年序号 = (公历年 - 4) mod 60（甲子=0）。
 * 返回 [年柱, 年干序号]。
 */
function computeYearPillar(input: 排盘Input, birthUtc: number): [string, number] {
  const lichunUtc = getLichunMoment(input.year);
  // 出生在立春之前 -> 归上一公历年
  const ganzhiYear = birthUtc < lichunUtc ? input.year - 1 : input.year;
  const index = (((ganzhiYear - 4) % 60) + 60) % 60;
  return [六十甲子(index), index % 10];
}

/**
 * 月柱计算：月柱在交每月之"节"那一刻切换（ADR-0001）。
 * 先定位出生时刻所属的"节月"（取出生时刻之前最近一次交节对应的月地支），
 * 月干由年柱对应的年干经五虎遁推出。立春前出生归上一干支年，月干随之用
 * 上一年的年干推算，与年柱归属保持一致。
 */
function computeMonthPillar(
  input: 排盘Input,
  birthUtc: number,
  yearGanIndex: number,
): string {
  // 候选：本公历年与上一公历年的所有"节"交节时刻。取 <= birth 的最近一个。
  let bestJieIdx = -1;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const year of [input.year - 1, input.year]) {
    for (let i = 0; i < JIE_TERM_INDEXES.length; i++) {
      const ms = getSolarTermMoment(year, JIE_TERM_INDEXES[i]!);
      if (ms <= birthUtc && ms > bestMs) {
        bestMs = ms;
        bestJieIdx = i;
      }
    }
  }

  // 命理上出生时刻必落在某个节月内（不存在最早的节），bestJieIdx 必有解。
  const monthZhiIndex = JIE_MONTH_ZHI_INDEX[bestJieIdx]!;
  // 寅月天干 + 从寅月起算的步数（寅=0、卯=1…子=10、丑=11），10 天干循环
  const yinGan = yinMonthGanIndex(yearGanIndex);
  const step = ((monthZhiIndex - 2) + 12) % 12;
  const monthGanIndex = (yinGan + step) % 10;
  return `${天干[monthGanIndex]}${地支[monthZhiIndex]}`;
}

/**
 * 排盘纯函数。
 * T3：返回年柱 + 月柱 + 日柱。
 * - 年柱按立春切换、月柱按节切换（ADR-0001）
 * - 日柱按公历日，日界线在子正（00:00）；23:59 仍属当日，次日 00:00 切为新日柱
 */
export function 排盘(input: 排盘Input): 排盘Result {
  const offset = daysSinceAnchor(input.year, input.month, input.day);
  const birthUtc = inputToUtcMs(input);
  const [年柱, yearGanIndex] = computeYearPillar(input, birthUtc);
  return {
    年柱,
    月柱: computeMonthPillar(input, birthUtc, yearGanIndex),
    日柱: 六十甲子(DAY_PILLAR_ANCHOR_INDEX + offset),
  };
}
