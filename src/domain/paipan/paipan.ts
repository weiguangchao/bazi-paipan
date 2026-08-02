// 命盘内部排盘纯计算：输入出生真太阳时、出生 Jie 位置与性别，返回四柱和大运。
// 遵循 ADR-0001（年柱按立春切换、月柱按节切换）、ADR-0002（日界线在子正、早晚子时）
// 四柱、早晚子时与起运使用同一个出生真太阳时。

import {
  liushijiazi,
  tiangan,
  dizhi,
  ganzhiFromCharacters,
  type Ganzhi,
} from "@/domain/ganzhi/ganzhi";
import { dayun, type Gender, type DayunResult } from "@/domain/paipan/dayun";
import type { TrueSolarDateTime } from "@/domain/time/date-time";
import type {
  JieOccurrence,
  JieLocation,
} from "@/domain/time/jie-chronology";

/** 命盘内部排盘输出：四柱与必需的大运。 */
export interface PaipanResult {
  nianzhu: Ganzhi;
  yuezhu: Ganzhi;
  rizhu: Ganzhi;
  shizhu: Ganzhi;
  dayun: DayunResult;
}

// 锚点：2000-01-01 日柱为戊午，六十甲子序号 54（甲子=0）
// 真值来源：Deep Oracle 排盘 https://www.deeporacle.ai/zh-TW/bazi/chart/2000/1/1
const RIZHU_ANCHOR_YEAR = 2000;
const RIZHU_ANCHOR_MONTH = 1; // 1 月
const RIZHU_ANCHOR_DAY = 1;
const RIZHU_ANCHOR_INDEX = 54;

// 月地支序号（子=0、丑=1、寅=2…亥=11）：立春->寅(2)…小寒->丑(1)。
const JIE_MONTH_DIZHI_INDEX: Readonly<Record<JieOccurrence["jie"], number>> = {
  "立春": 2,
  "惊蛰": 3,
  "清明": 4,
  "立夏": 5,
  "芒种": 6,
  "小暑": 7,
  "立秋": 8,
  "白露": 9,
  "寒露": 10,
  "立冬": 11,
  "大雪": 0,
  "小寒": 1,
};

/**
 * 五虎遁：由年干推出寅月天干（起月诀）。
 * 甲己丙作首、乙庚戊为头、丙辛庚起、丁壬壬起、戊癸甲起。
 * 返回寅月天干序号（0=甲…9=癸）。
 */
function firstMonthTianganIndex(yearTianganIndex: number): number {
  // 起点偏移：甲/己->丙(2)、乙/庚->戊(4)、丙/辛->庚(6)、丁/壬->壬(8)、戊/癸->甲(0)
  return [2, 4, 6, 8, 0][yearTianganIndex % 5]!;
}

/** 计算从锚点日期到目标日期的天数差（目标 - 锚点） */
function daysSinceAnchor(year: number, month: number, day: number): number {
  // Date.UTC 第二参 monthIndex 从 0 起 -- 月需要 -1
  const target = Date.UTC(year, month - 1, day);
  const anchor = Date.UTC(
    RIZHU_ANCHOR_YEAR,
    RIZHU_ANCHOR_MONTH - 1,
    RIZHU_ANCHOR_DAY,
  );
  return Math.round((target - anchor) / 86_400_000);
}

/**
 * 年柱计算：年柱在交立春那一刻切换（ADR-0001）。
 * 立春前出生归上一公历年的干支年；立春后（含）出生归本公历年的干支年。
 * 干支年序号 = (公历年 - 4) mod 60（甲子=0）。
 * 返回 [年柱, 年干序号]。
 */
function computeNianzhu(lichunYear: number): [Ganzhi, number] {
  const index = (((lichunYear - 4) % 60) + 60) % 60;
  return [liushijiazi(index), index % 10];
}

/**
 * 月柱计算：月柱在交每月之"节"那一刻切换（ADR-0001）。
 * 先定位出生时刻所属的"节月"（取出生时刻之前最近一次交节对应的月地支），
 * 月干由年柱对应的年干经五虎遁推出。立春前出生归上一干支年，月干随之用
 * 上一年的年干推算，与年柱归属保持一致。
 */
function computeYuezhu(
  jie: JieOccurrence["jie"],
  yearTianganIndex: number,
): Ganzhi {
  const monthDizhiIndex = JIE_MONTH_DIZHI_INDEX[jie];
  // 寅月天干 + 从寅月起算的步数（寅=0、卯=1…子=10、丑=11），10 天干循环
  const firstMonthTiangan = firstMonthTianganIndex(yearTianganIndex);
  const step = ((monthDizhiIndex - 2) + 12) % 12;
  const monthTianganIndex = (firstMonthTiangan + step) % 10;
  return ganzhiFromCharacters(tiangan[monthTianganIndex]!, dizhi[monthDizhiIndex]!);
}

/**
 * 时柱地支序号：按时辰取。子时 23:00-01:00（地支子=0），每两小时推进一支。
 * hour=23 或 0 -> 子(0)、hour=1/2 -> 丑(1)……hour=21/22 -> 亥(11)。
 */
function hourDizhiIndex(hour: number): number {
  return Math.floor((hour + 1) / 2) % 12;
}

/**
 * 五鼠遁：由日干推出子时天干（起时诀）。
 * 甲己还加甲、乙庚丙作初、丙辛从戊起、丁壬庚子居、戊癸壬子真。
 * 返回子时天干序号（0=甲…9=癸）。
 */
function zishiTianganIndex(dayTianganIndex: number): number {
  // 日干序号 mod 5 决定起点：甲/己->甲(0)、乙/庚->丙(2)、丙/辛->戊(4)、丁/壬->庚(6)、戊/癸->壬(8)
  return [0, 2, 4, 6, 8][dayTianganIndex % 5]!;
}

/**
 * 时柱计算：地支按时辰取，天干由日干按五鼠遁推出。
 * 子时依早晚子时（ADR-0002）--日柱已按公历日对齐子正（00:00），故日干随历法日
 * 自然切换：23:00-00:00 晚子时用当日日干、00:00-01:00 早子时用次日（历法当日）日干。
 */
function computeShizhu(hour: number, dayTianganIndex: number): Ganzhi {
  const dizhiIndex = hourDizhiIndex(hour);
  const tianganIndex = (zishiTianganIndex(dayTianganIndex) + dizhiIndex) % 10;
  return ganzhiFromCharacters(tiangan[tianganIndex]!, dizhi[dizhiIndex]!);
}

/**
 * 命盘内部排盘纯函数。
 * - 年柱按真太阳时立春切换、月柱按真太阳时 Jie 切换（ADR-0007）
 * - 起运按严格相邻真太阳时 Jie 求差，起运年月从出生真太阳时年月起算
 * - 日柱按公历日，日界线在子正（00:00）；23:59 仍属当日，次日 00:00 切为新日柱
 * - 时柱地支按时辰取，天干由日干按五鼠遁推出；子时依早晚子时（ADR-0002）
 * - 日柱、时柱使用真太阳时
 * - 大运从月柱出发排 10 柱，方向按阳男阴女顺/阴男阳女逆；起运岁按出生时刻到
 *   最近一节的天数 3 天折 1 年折算（精确到年+月）
 */
export function paipan(
  birthTime: TrueSolarDateTime,
  jieLocation: JieLocation,
  gender: Gender,
): PaipanResult {
  const offset = daysSinceAnchor(
    birthTime.year,
    birthTime.month,
    birthTime.day,
  );
  const [nianzhu, yearTianganIndex] = computeNianzhu(jieLocation.interval.lichunYear);
  // 六十甲子序号需归一化到 [0,60)：锚点前的日期 offset 为负，% 在 JS 保留符号，
  // 不包装会让天干/地支取到 undefined。dayTianganIndex 与 日柱 复用同一归一化结果。
  const dayIndex = (((RIZHU_ANCHOR_INDEX + offset) % 60) + 60) % 60;
  const dayTianganIndex = dayIndex % 10;
  const yuezhu = computeYuezhu(jieLocation.interval.start.jie, yearTianganIndex);
  return {
    nianzhu,
    yuezhu,
    rizhu: liushijiazi(dayIndex),
    shizhu: computeShizhu(birthTime.hour, dayTianganIndex),
    dayun: dayun({
      yuezhu,
      yearTianganIndex,
      gender,
      birthTime,
      jieLocation,
    }),
  };
}
