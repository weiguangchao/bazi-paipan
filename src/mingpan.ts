// 命盘深模块：以 typed 出生资料与当前年月为输入，一次产出完整命盘。
// 词汇遵循 CONTEXT.md（命盘、四柱、天干十神、藏干十神、大运、流年、干支关系、生肖、星座、日主）。
//
// 日主推导与十神附加在此统一完成：四柱、大运柱、流年柱共用 shishen() 一处规则，
// 调用方（adapter）不再自行取日主、不再重复附加十神。命盘不读时钟，当前年月由调用方注入。
// 遵循 ADR-0001/0002/0003/0004，领域规则全部委托既有纯函数（paipan/shishen/ganzhiRelations/...）。

import { paipan, type PaipanInput } from "./paipan.js";
import { liunian } from "./liunian.js";
import { shishen, cangganTable } from "./shishen.js";
import { ganzhiDizhi, ganzhiTiangan, type Ganzhi, type Tiangan } from "./ganzhi.js";
import {
  ganzhiRelations,
  type GanzhiRelationsResult,
} from "./ganzhi-relations.js";
import { personalInfo, type PersonalInfo } from "./personal-info.js";
import type { CurrentYearMonth } from "./birth-date.js";

/** 藏干及其相对日主的十神。 */
export interface CangganOut {
  tiangan: string;
  shishen: string;
}

/** 单柱命盘结构。 */
export interface ZhuOut {
  ganzhi: string;
  shishen: string; // 天干十神；日柱天干位为 "日主"
  canggan: CangganOut[]; // 藏干及其副星（与藏干顺序一致）
}

export interface SizhuOut {
  year: ZhuOut;
  month: ZhuOut;
  day: ZhuOut;
  hour: ZhuOut;
}

export interface LiunianItemOut {
  year: number;
  ganzhi: string;
  tianganShishen: string;
  dizhiShishen: string;
  isCurrentYear: boolean;
}

export interface DayunzhuOut {
  ganzhi: string;
  tianganShishen: string;
  dizhiShishen: string;
  qiyun: { ageYears: number; ageMonths: number };
  startYear: number;
  startMonth: number;
  isCurrent: boolean;
  liunian: LiunianItemOut[];
}

export interface DayunOut {
  direction: "顺" | "逆";
  qiyun: { ageYears: number; ageMonths: number };
  zhu: DayunzhuOut[];
}

export interface TipOut {
  code: string;
  message: string;
}

/** 完整命盘：四柱、大运、干支关系、生肖星座、提示语义标志。 */
export interface Mingpan {
  personal: PersonalInfo;
  sizhu: SizhuOut;
  ganzhiRelations: GanzhiRelationsResult;
  tips: TipOut[];
  dayun: DayunOut;
}

/** 统一十神附加：干支天干十神 + 地支藏干十神（按藏干顺序）。命盘各柱共用此处。 */
function shishenOf(ganzhi: Ganzhi, dayMaster: Tiangan) {
  return shishen(dayMaster, ganzhi);
}

/** 四柱单柱：天干十神（日柱标 "日主"）+ 藏干各自十神。 */
function sizhuZhu(ganzhi: Ganzhi, dayMaster: Tiangan, isRizhu: boolean): ZhuOut {
  const { tianganShishen, cangganShishen } = shishenOf(ganzhi, dayMaster);
  const canggan = cangganTable[ganzhiDizhi(ganzhi)]!;
  return {
    ganzhi,
    shishen: isRizhu ? "日主" : tianganShishen,
    canggan: canggan.map((tiangan, i) => ({ tiangan, shishen: cangganShishen[i]! })),
  };
}

/** 大运柱/流年柱十神：天干十神 + 地支本气十神（藏干表首项）。 */
function zhuShishen(
  ganzhi: Ganzhi,
  dayMaster: Tiangan,
): { tianganShishen: string; dizhiShishen: string } {
  const { tianganShishen, cangganShishen } = shishenOf(ganzhi, dayMaster);
  return { tianganShishen, dizhiShishen: cangganShishen[0]! };
}

/** 流年柱：十神由命盘统一附加，是否今年按当前年判定。 */
function liunianZhu(
  item: { year: number; ganzhi: Ganzhi },
  dayMaster: Tiangan,
  currentYear: number,
): LiunianItemOut {
  return {
    year: item.year,
    ganzhi: item.ganzhi,
    ...zhuShishen(item.ganzhi, dayMaster),
    isCurrentYear: item.year === currentYear,
  };
}

/** 大运柱：十神由命盘统一附加，当前大运按当前年月判定，关联流年由命盘统一产出。 */
function dayunZhu(
  p: {
    ganzhi: Ganzhi;
    qiyun: { ageYears: number; ageMonths: number };
    startYearMonth: { year: number; month: number };
  },
  dayMaster: Tiangan,
  currentYear: number,
  currentMonth: number,
): DayunzhuOut {
  const startMonthIndex = p.startYearMonth.year * 12 + p.startYearMonth.month - 1;
  const currentMonthIndex = currentYear * 12 + currentMonth - 1;
  return {
    ganzhi: p.ganzhi,
    ...zhuShishen(p.ganzhi, dayMaster),
    qiyun: { ageYears: p.qiyun.ageYears, ageMonths: p.qiyun.ageMonths },
    startYear: p.startYearMonth.year,
    startMonth: p.startYearMonth.month,
    isCurrent:
      currentMonthIndex >= startMonthIndex && currentMonthIndex < startMonthIndex + 120,
    liunian: liunian(p.startYearMonth.year).map((item) =>
      liunianZhu(item, dayMaster, currentYear),
    ),
  };
}

/** 提示语义标志：判定在命盘、文案随 code 一并产出（文案归属 UI 见 #108）。 */
function buildTips(result: {
  nearZizheng: boolean;
  longitudeCorrectionApplied: boolean;
}): TipOut[] {
  const tips: TipOut[] = [];
  if (result.nearZizheng) {
    tips.push({ code: "NEAR_ZI_ZHENG", message: "出生时刻近子正（00:00），已按早晚子时归属日柱与时柱；若实际时刻略有出入，排盘结果可能不同。" });
  }
  if (!result.longitudeCorrectionApplied) {
    tips.push({ code: "NO_LONGITUDE_CORRECTION", message: "未做经度修正，真太阳时可能偏移。给出出生省市可按出生地经度修正为真太阳时。" });
  } else {
    tips.push({ code: "TRUE_SOLAR_TIME", message: "已按出生地经度修正与均时差合成为真太阳时排盘。" });
  }
  return tips;
}

/**
 * 命盘纯函数：typed 出生资料 + 当前年月 → 完整命盘。
 * 一次产出四柱（含天干十神与藏干十神）、大运（含各柱十神与大运关联流年含十神）、
 * 干支关系、生肖星座、提示语义标志。日主推导与十神附加在此统一完成。
 */
export async function mingpan(
  input: PaipanInput,
  now: CurrentYearMonth,
): Promise<Mingpan> {
  const result = await paipan(input);
  const dayMaster = ganzhiTiangan(result.rizhu);

  const personal = personalInfo({ year: input.year, month: input.month, day: input.day });

  const sizhu: SizhuOut = {
    year: sizhuZhu(result.nianzhu, dayMaster, false),
    month: sizhuZhu(result.yuezhu, dayMaster, false),
    day: sizhuZhu(result.rizhu, dayMaster, true),
    hour: sizhuZhu(result.shizhu, dayMaster, false),
  };

  const ganzhiRelationsResult = ganzhiRelations({
    nianzhu: result.nianzhu,
    yuezhu: result.yuezhu,
    rizhu: result.rizhu,
    shizhu: result.shizhu,
  });

  const tips = buildTips(result);

  const dayun = result.dayun!;
  const { year: currentYear, month: currentMonth } = now;
  const dayunOut: DayunOut = {
    direction: dayun.direction,
    qiyun: { ageYears: dayun.qiyun.ageYears, ageMonths: dayun.qiyun.ageMonths },
    zhu: dayun.zhu.map((p) =>
      dayunZhu(p, dayMaster, currentYear, currentMonth),
    ),
  };

  return { personal, sizhu, ganzhiRelations: ganzhiRelationsResult, tips, dayun: dayunOut };
}