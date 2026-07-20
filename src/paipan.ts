// 排盘纯函数
// 单一测试 seam：输入钟表时出生时刻（可选出生地），返回年柱 + 月柱 + 日柱 + 时柱
// 遵循 ADR-0001（年柱按立春切换、月柱按节切换）、ADR-0002（日界线在子正、早晚子时）
// 经度修正作为输入预处理（CONTEXT.md）：给出出生地时把钟表时平移为真太阳时，
// 所有柱从修正后的时刻算起。

import { 六十甲子, 天干, 地支 } from "./ganzhi.js";
import { getLichunMoment, getSolarTermMoment } from "./jieqi.js";
import { 应用经度修正 } from "./solar-time.js";
import { 查找经度, type 出生地 } from "./birthplace.js";

/** 排盘输入：公历年月日 + 时分（钟表时，北京时间 UTC+8），可选出生地。 */
export interface 排盘Input {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /**
   * 可选出生地。给出时按经度修正为真太阳时再排盘；未给出时走钟表时。
   * 查不到省/市时抛 RangeError（CLI 应捕获并提示用户）。
   */
  birthplace?: 出生地;
}

/** 排盘输出 - T5 阶段含年柱 + 月柱 + 日柱 + 时柱 + 经度修正标志。 */
export interface 排盘Result {
  年柱: string;
  月柱: string;
  日柱: string;
  时柱: string;
  /** 出生时刻近子正（00:00）时为 true，CLI 据此打印跨界提示 */
  近子正: boolean;
  /**
   * 是否对出生时刻做了经度修正（即是否提供了有效出生地）。
   * CLI 据此决定是否打印"未做经度修正，真太阳时可能偏移"提示。
   */
  经度修正: boolean;
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

/** 把 UTC 毫秒时间戳分解为北京时间（UTC+8）的年月日时分。clockTimeToUtcMs 的逆运算。 */
function utcMsToBeijingFields(utcMs: number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const d = new Date(utcMs + BEIJING_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

/**
 * 解析实际用于排盘的时刻（输入预处理）。
 * - 给出出生地且查到经度：把钟表时按经度修正为真太阳时，返回修正后的排盘输入 + 经度修正=true。
 * - 未给出生地：返回原输入（birthplace 去掉，避免下游再处理）+ 经度修正=false。
 * - 给出出生地但查不到省/市：抛 RangeError。
 *
 * 真太阳时是本地太阳时，但排盘的所有切换点（立春、节、子正）都按钟表时日期分解
 * 来对比，故这里只做时间戳平移后重新按钟表时分解，不改时区。
 */
function resolveEffectiveInput(input: 排盘Input): {
  effective: 排盘Input;
  经度修正: boolean;
} {
  if (!input.birthplace) {
    return { effective: stripBirthplace(input), 经度修正: false };
  }
  const r = 查找经度(input.birthplace);
  if (!r.找到) {
    const where = r.原因 === "未知省份"
      ? `省份"${input.birthplace.province}"`
      : `省份"${input.birthplace.province}"下的城市"${input.birthplace.city}"`;
    throw new RangeError(`未知出生地：${where}，无法做经度修正`);
  }
  const clockUtc = inputToUtcMs(input);
  const solarUtc = 应用经度修正(clockUtc, r.经度);
  return {
    effective: { ...utcMsToBeijingFields(solarUtc) },
    经度修正: true,
  };
}

/** 去掉 birthplace，返回纯钟表时排盘输入。 */
function stripBirthplace(input: 排盘Input): 排盘Input {
  const { birthplace: _bp, ...rest } = input;
  return rest;
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
 * 时柱地支序号：按时辰取。子时 23:00-01:00（地支子=0），每两小时推进一支。
 * hour=23 或 0 -> 子(0)、hour=1/2 -> 丑(1)……hour=21/22 -> 亥(11)。
 */
function hourZhiIndex(hour: number): number {
  return Math.floor((hour + 1) / 2) % 12;
}

/**
 * 五鼠遁：由日干推出子时天干（起时诀）。
 * 甲己还加甲、乙庚丙作初、丙辛从戊起、丁壬庚子居、戊癸壬子真。
 * 返回子时天干序号（0=甲…9=癸）。
 */
function ziHourGanIndex(dayGanIndex: number): number {
  // 日干序号 mod 5 决定起点：甲/己->甲(0)、乙/庚->丙(2)、丙/辛->戊(4)、丁/壬->庚(6)、戊/癸->壬(8)
  return [0, 2, 4, 6, 8][dayGanIndex % 5]!;
}

/**
 * 时柱计算：地支按时辰取，天干由日干按五鼠遁推出。
 * 子时依早晚子时（ADR-0002）--日柱已按公历日对齐子正（00:00），故日干随历法日
 * 自然切换：23:00-00:00 晚子时用当日日干、00:00-01:00 早子时用次日（历法当日）日干。
 */
function computeHourPillar(hour: number, dayGanIndex: number): string {
  const zhiIdx = hourZhiIndex(hour);
  const ganIdx = (ziHourGanIndex(dayGanIndex) + zhiIdx) % 10;
  return `${天干[ganIdx]}${地支[zhiIdx]}`;
}

/** 子正跨界提示阈值（分钟）：出生时刻距最近子正（00:00）在此范围内时判定为近子正 */
const ZI_ZHENG_WARN_MINUTES = 15;

/** 出生时刻是否近子正（00:00）。子正为早晚子时分界，近子正时刻几分出入即影响日柱/时柱。 */
function isNearZiZheng(hour: number, minute: number): boolean {
  const minutesOfDay = hour * 60 + minute;
  const distToMidnight = Math.min(minutesOfDay, 1440 - minutesOfDay);
  return distToMidnight <= ZI_ZHENG_WARN_MINUTES;
}

/**
 * 排盘纯函数。
 * T5：返回年柱 + 月柱 + 日柱 + 时柱 + 经度修正标志。
 * - 真太阳时作为输入预处理：给出出生地时按经度修正为真太阳时，所有柱从修正后
 *   的时刻算起（CONTEXT.md 经度修正）。未给出生地走钟表时。
 * - 年柱按立春切换、月柱按节切换（ADR-0001）
 * - 日柱按公历日，日界线在子正（00:00）；23:59 仍属当日，次日 00:00 切为新日柱
 * - 时柱地支按时辰取，天干由日干按五鼠遁推出；子时依早晚子时（ADR-0002）
 * - 近子正判定基于实际排盘所用时刻（已做经度修正）
 */
export function 排盘(input: 排盘Input): 排盘Result {
  const { effective, 经度修正 } = resolveEffectiveInput(input);
  const offset = daysSinceAnchor(effective.year, effective.month, effective.day);
  const birthUtc = inputToUtcMs(effective);
  const [年柱, yearGanIndex] = computeYearPillar(effective, birthUtc);
  // 六十甲子序号需归一化到 [0,60)：锚点前的日期 offset 为负，% 在 JS 保留符号，
  // 不包装会让天干/地支取到 undefined。dayGanIndex 与 日柱 复用同一归一化结果。
  const dayIndex = (((DAY_PILLAR_ANCHOR_INDEX + offset) % 60) + 60) % 60;
  const dayGanIndex = dayIndex % 10;
  return {
    年柱,
    月柱: computeMonthPillar(effective, birthUtc, yearGanIndex),
    日柱: 六十甲子(dayIndex),
    时柱: computeHourPillar(effective.hour, dayGanIndex),
    近子正: isNearZiZheng(effective.hour, effective.minute),
    经度修正,
  };
}
