// 命盘深模块：以 typed 出生资料与当前时刻为输入，一次产出完整命盘。
// 词汇遵循 CONTEXT.md（命盘、四柱、天干十神、藏干十神、大运、流年、流月、干支关系、生肖、星座、日主）。
//
// 日主推导与十神附加在此统一完成：四柱、大运柱、流年柱共用 shishen() 一处规则，
// 调用方（adapter）不再自行取日主、不再重复附加十神。命盘不读时钟，当前时刻由调用方注入。
// 遵循 ADR-0001/0002/0003/0006/0007，领域规则全部委托既有纯函数（paipan/shishen/ganzhiRelations/...）。

import { paipan } from "@/domain/paipan/paipan";
import { liunian } from "@/domain/paipan/liunian";
import { liuyue } from "@/domain/paipan/liuyue";
import { shishen, cangganTable } from "@/domain/ganzhi/shishen";
import { ganzhiDizhi, ganzhiTiangan, type Ganzhi, type Tiangan } from "@/domain/ganzhi/ganzhi";
import {
  ganzhiRelations,
  type GanzhiRelationsResult,
} from "@/domain/ganzhi/ganzhi-relations";
import { personalInfo, type PersonalInfo } from "@/domain/birth/personal-info";
import type { BirthProfile } from "@/domain/birth/birth-profile";
import { findLongitude } from "@/domain/birth/birthplace";
import { toTrueSolarDateTime } from "@/domain/time/astronomy";
import type {
  BeijingDateTime,
  TrueSolarDateTime,
} from "@/domain/time/date-time";
import {
  jieIntervals,
  locateJie,
  type JieInterval,
} from "@/domain/time/jie-chronology";

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
  liuyue: LiuyuezhuOut[];
}

export interface LiuyuezhuOut {
  ganzhi: string;
  startJie: string;
  startMonth: number;
  startDay: number;
  tianganShishen: string;
  dizhiShishen: string;
  isCurrent: boolean;
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

/** 完整命盘：四柱、大运、干支关系、生肖星座。 */
export interface Mingpan {
  personal: PersonalInfo;
  sizhu: SizhuOut;
  ganzhiRelations: GanzhiRelationsResult;
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

/** 大运柱/流年柱/流月柱十神：天干十神 + 地支本气十神（藏干表首项）。 */
function zhuShishen(
  ganzhi: Ganzhi,
  dayMaster: Tiangan,
): { tianganShishen: string; dizhiShishen: string } {
  const { tianganShishen, cangganShishen } = shishenOf(ganzhi, dayMaster);
  return { tianganShishen, dizhiShishen: cangganShishen[0]! };
}

/** 流年柱：十神和十二个流月柱由命盘统一附加，是否今年按当前年判定。 */
function liunianZhu(
  item: { year: number; ganzhi: Ganzhi },
  dayMaster: Tiangan,
  currentClockTime: BeijingDateTime,
  intervals: readonly JieInterval[],
  currentInterval: JieInterval,
): LiunianItemOut {
  return {
    year: item.year,
    ganzhi: item.ganzhi,
    ...zhuShishen(item.ganzhi, dayMaster),
    isCurrentYear: item.year === currentClockTime.year,
    liuyue: liuyue(item.year, intervals, currentInterval).map((liuyuezhu) => {
      const { startTime: _startTime, endTime: _endTime, ...visible } = liuyuezhu;
      return {
        ...visible,
        ...zhuShishen(liuyuezhu.ganzhi, dayMaster),
      };
    }),
  };
}

/** 大运柱：十神由命盘统一附加，当前大运按当前真太阳时年月判定，关联流年与流月由命盘统一产出。 */
function dayunZhu(
  p: {
    ganzhi: Ganzhi;
    qiyun: { ageYears: number; ageMonths: number };
    startYearMonth: { year: number; month: number };
  },
  dayMaster: Tiangan,
  currentTime: TrueSolarDateTime,
  currentClockTime: BeijingDateTime,
  intervalsByYear: ReadonlyMap<number, readonly JieInterval[]>,
  currentInterval: JieInterval,
): DayunzhuOut {
  const startMonthIndex = p.startYearMonth.year * 12 + p.startYearMonth.month - 1;
  const currentMonthIndex = currentTime.year * 12 + currentTime.month - 1;
  return {
    ganzhi: p.ganzhi,
    ...zhuShishen(p.ganzhi, dayMaster),
    qiyun: { ageYears: p.qiyun.ageYears, ageMonths: p.qiyun.ageMonths },
    startYear: p.startYearMonth.year,
    startMonth: p.startYearMonth.month,
    isCurrent:
      currentMonthIndex >= startMonthIndex && currentMonthIndex < startMonthIndex + 120,
    liunian: liunian(p.startYearMonth.year).map((item) =>
      liunianZhu(
        item,
        dayMaster,
        currentClockTime,
        intervalsByYear.get(item.year)!,
        currentInterval,
      ),
    ),
  };
}

function birthplaceLongitude(input: BirthProfile): number | undefined {
  if (!input.birthplace) return undefined;
  const result = findLongitude(input.birthplace);
  if (!result.found) {
    throw new RangeError("出生资料包含未知出生地，无法计算当前真太阳时");
  }
  return result.longitude;
}

/**
 * 命盘纯函数：typed 出生资料 + 当前时刻 → 完整命盘。
 * 一次产出四柱（含天干十神与藏干十神）、大运（含各柱十神与大运关联流年、流月含十神）、
 * 干支关系、生肖星座。日主推导与十神附加在此统一完成。
 */
export function mingpan(
  input: BirthProfile,
  currentTime: BeijingDateTime,
): Mingpan {
  const result = paipan(input);
  const longitude = birthplaceLongitude(input);
  const currentTrueSolarTime = toTrueSolarDateTime(
    currentTime,
    longitude,
  );
  const currentInterval = locateJie(currentTrueSolarTime, longitude).interval;
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

  const dayun = result.dayun!;
  const liunianYears = new Set(
    dayun.zhu.flatMap((p) =>
      liunian(p.startYearMonth.year).map((item) => item.year),
    ),
  );
  const intervalsByYear = new Map(
    [...liunianYears].map((year) => [year, jieIntervals(year, longitude)]),
  );
  const dayunOut: DayunOut = {
    direction: dayun.direction,
    qiyun: { ageYears: dayun.qiyun.ageYears, ageMonths: dayun.qiyun.ageMonths },
    zhu: dayun.zhu.map((p) =>
      dayunZhu(
        p,
        dayMaster,
        currentTrueSolarTime,
        currentTime,
        intervalsByYear,
        currentInterval,
      ),
    ),
  };

  return { personal, sizhu, ganzhiRelations: ganzhiRelationsResult, dayun: dayunOut };
}
