// 大运计算 - 纯函数，排盘的后置步骤。
// 词汇遵循 CONTEXT.md：节、立春。
//
// 大运从月柱出发排 10 柱，每柱管 10 年。方向按"阳男阴女顺、阴男阳女逆"
// （依共识；此时输入须带性别）。起运岁由出生时刻到最近一"节"的天数按
// 3 天折 1 年折算，精确到年+月（1 天 ≈ 4 个月），报为"N岁M月起运"。
// 顺行从出生时刻向前数到下一节，逆行向后数到上一节。每柱天干地支从月柱
// 顺行 +1 或逆行 −1 推出。

import {
  tiangan,
  dizhi,
  ganzhiDizhi,
  ganzhiFromCharacters,
  ganzhiTiangan,
  type Ganzhi,
} from "@/domain/ganzhi/ganzhi";
import {
  compareDateTime,
  diffSeconds,
  type BeijingDateTime,
} from "@/domain/time/date-time";
import { JIE_NAMES, jieMoment } from "@/domain/time/astronomy";

/** 性别。命理上阳男阴女顺行、阴男阳女逆行，须带性别才能定方向。 */
export type Gender = "男" | "女";

/** 大运方向：顺行（从月柱顺推干支 +1，起运数到下一节）或逆行（−1，上一节）。 */
export type DayunDirection = "顺" | "逆";

/**
 * 起运岁：精确到年+月。3 天折 1 年、1 天折 4 个月。
 * 命理表述"N岁M月起运"。M 为 0-11。
 */
export interface Qiyunsui {
  /** 整年数。 */
  ageYears: number;
  /** 整月数（0-11）。 */
  ageMonths: number;
}

/** 单柱大运：干支 + 起运年月 + 起运岁 + 管辖岁段。 */
export interface Dayunzhu {
  /** 第几柱大运，0-based。 */
  index: number;
  /** 该柱干支。 */
  ganzhi: Ganzhi;
  /** 该柱起算的起运岁（第 0 柱起于起运岁，每柱递增 10 岁）。 */
  qiyun: Qiyunsui;
  /** 该柱起始公历年月（第 0 柱 = 出生年 + 起运岁；每柱递增 10 年）。 */
  startYearMonth: { year: number; month: number };
}

/** 大运完整结果：方向 + 起运岁 + 10 柱。 */
export interface DayunResult {
  /** 方向：阳男/阴女顺、阴男/阳女逆。 */
  direction: DayunDirection;
  /** 从出生时刻到最近一节折算的起运岁（精确到年+月）。 */
  qiyun: Qiyunsui;
  /** 10 柱大运。 */
  zhu: Dayunzhu[];
}

const SECONDS_PER_DAY = 86_400;
/**
 * 判定大运方向。阳年（年干序号为偶：甲丙戊庚壬）男 / 阴年女顺行；
 * 阴年男 / 阳年女逆行。阳阴按年干序号奇偶：0,2,4,6,8 为阳，1,3,5,7,9 为阴。
 */
export function determineDayunDirection(gender: Gender, yearTianganIndex: number): DayunDirection {
  const isYangYear = yearTianganIndex % 2 === 0;
  // 阳男、阴女顺；阴男、阳女逆
  const forward = isYangYear === (gender === "男");
  return forward ? "顺" : "逆";
}

/**
 * 找出生时刻方向侧最近一次"节"（交节时刻）：forward=true 取下一节（严格大于出生时刻），
 * forward=false 取上一节（严格小于出生时刻）。
 */
function findAdjacentJie(
  birthTime: BeijingDateTime,
  forward: boolean,
): BeijingDateTime {
  let best: BeijingDateTime | undefined;
  for (const year of [birthTime.year - 1, birthTime.year, birthTime.year + 1]) {
    for (const jie of JIE_NAMES) {
      const moment = jieMoment(year, jie);
      const comparison = compareDateTime(moment, birthTime);
      if (forward) {
        if (
          comparison > 0
          && (!best || compareDateTime(moment, best) < 0)
        ) best = moment;
      } else {
        if (
          comparison < 0
          && (!best || compareDateTime(moment, best) > 0)
        ) best = moment;
      }
    }
  }
  if (!best) throw new RangeError("出生时刻附近不存在可用的节");
  return best;
}

/**
 * 折算起运岁：由出生时刻到最近一节的天数按 3 天折 1 年折算，
 * 精确到年+月（1 天 ≈ 4 个月）。
 */
function calculateQiyunsui(diffSecondsValue: number): Qiyunsui {
  const totalDays = diffSecondsValue / SECONDS_PER_DAY;
  // 3 天 = 1 年 = 12 月，故 1 天 = 4 月。总月数 = totalDays * 4。
  const totalMonths = totalDays * 4;
  const ageYears = Math.floor(totalMonths / 12);
  const ageMonths = Math.floor(totalMonths - ageYears * 12);
  return { ageYears, ageMonths };
}

/**
 * 计算大运起运年月（公历）。第 0 柱起于"出生年 + 起运岁"所在公历年月，
 * 之后每柱递增 10 年。月份按起运岁中的月数加到出生月上。
 */
function computeStartYearMonth(
  birthYear: number,
  birthMonth: number,
  qiyunsui: Qiyunsui,
  zhuIndex: number,
): { year: number; month: number } {
  const totalStartMonths = (birthYear * 12 + (birthMonth - 1)) + qiyunsui.ageYears * 12 + qiyunsui.ageMonths;
  const startMonths = totalStartMonths + zhuIndex * 120; // 每柱 10 年 = 120 月
  return {
    year: Math.floor(startMonths / 12),
    month: (startMonths % 12) + 1,
  };
}

/** 从月柱干支拆出月干序号与月支序号。 */
function splitZhu(zhu: Ganzhi): { tianganIndex: number; dizhiIndex: number } {
  const tianganIndex = tiangan.indexOf(ganzhiTiangan(zhu));
  const dizhiIndex = dizhi.indexOf(ganzhiDizhi(zhu));
  return { tianganIndex, dizhiIndex };
}

/** 大运输入：单一对象参数，含月柱、年干序号、性别与出生时刻。 */
export interface DayunInput {
  /** 月柱 起点干支（如 "戊寅"）。 */
  yuezhu: Ganzhi;
  /** 年干序号（0=甲…9=癸），用于判定阳阴年。 */
  yearTianganIndex: number;
  /** 性别。 */
  gender: Gender;
  /** 出生钟表时；起运间隔只与北京时间的节比较。 */
  birthTime: BeijingDateTime;
}

/**
 * 大运纯函数。
 *
 * @param input 月柱、年干序号、性别、出生时刻、出生年月
 * @returns 大运完整结果（方向 + 起运岁 + 10 柱）
 */
export function dayun(input: DayunInput): DayunResult {
  const { yuezhu, yearTianganIndex, gender, birthTime } = input;
  const direction = determineDayunDirection(gender, yearTianganIndex);
  const forward = direction === "顺";
  const adjacentJie = findAdjacentJie(birthTime, forward);
  const intervalSeconds = forward
    ? diffSeconds(adjacentJie, birthTime)
    : diffSeconds(birthTime, adjacentJie);
  const qiyunsui = calculateQiyunsui(intervalSeconds);

  const { tianganIndex: monthTianganIndex, dizhiIndex: monthDizhiIndex } = splitZhu(yuezhu);
  const step = forward ? 1 : -1;
  const zhu: Dayunzhu[] = [];
  for (let i = 0; i < 10; i++) {
    // 从月柱顺/逆推进 i+1 步。月柱本身是合法六十甲子（干支同进），故步进后干支
    // 奇偶仍匹配，可直接拼装。
    const tianganIndex = (((monthTianganIndex + step * (i + 1)) % 10) + 10) % 10;
    const dizhiIndex = (((monthDizhiIndex + step * (i + 1)) % 12) + 12) % 12;
    const startYearMonth = computeStartYearMonth(
      birthTime.year,
      birthTime.month,
      qiyunsui,
      i,
    );
    zhu.push({
      index: i,
      ganzhi: ganzhiFromCharacters(tiangan[tianganIndex]!, dizhi[dizhiIndex]!),
      qiyun: { ageYears: qiyunsui.ageYears + i * 10, ageMonths: qiyunsui.ageMonths },
      startYearMonth,
    });
  }

  return { direction, qiyun: qiyunsui, zhu };
}
