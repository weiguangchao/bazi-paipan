// 大运计算 - 纯函数，排盘的后置步骤。
// 词汇遵循 CONTEXT.md：节、立春。
//
// 大运从月柱出发排 8 柱，每柱管 10 年。方向按"阳男阴女顺、阴男阳女逆"
// （依共识；此时输入须带性别）。起运岁由出生时刻到最近一"节"的天数按
// 3 天折 1 年折算，精确到年+月（1 天 ≈ 4 个月），报为"N岁M月起运"。
// 顺行从出生时刻向前数到下一节，逆行向后数到上一节。每柱天干地支从月柱
// 顺行 +1 或逆行 −1 推出。

import { 六十甲子, 天干, 地支, JIE_TERM_INDEXES } from "./ganzhi.js";
import { getSolarTermMoment } from "./jieqi.js";

/** 性别。命理上阳男阴女顺行、阴男阳女逆行，须带性别才能定方向。 */
export type 性别 = "男" | "女";

/** 大运方向：顺行（从月柱顺推干支 +1，起运数到下一节）或逆行（−1，上一节）。 */
export type 大运方向 = "顺" | "逆";

/**
 * 起运岁：精确到年+月。3 天折 1 年、1 天折 4 个月。
 * 命理表述"N岁M月起运"。M 为 0-11。
 */
export interface 起运岁 {
  /** 整年数。 */
  岁: number;
  /** 整月数（0-11）。 */
  月: number;
}

/** 单柱大运：干支 + 起运年月 + 起运岁 + 管辖岁段。 */
export interface 大运柱 {
  /** 第几柱大运，0-based。 */
  序号: number;
  /** 该柱干支。 */
  干支: string;
  /** 该柱起算的起运岁（第 0 柱起于起运岁，每柱递增 10 岁）。 */
  起运岁: 起运岁;
  /** 该柱起始公历年月（第 0 柱 = 出生年 + 起运岁；每柱递增 10 年）。 */
  起年月: { year: number; month: number };
}

/** 大运完整结果：方向 + 起运岁 + 8 柱。 */
export interface 大运Result {
  /** 方向：阳男/阴女顺、阴男/阳女逆。 */
  方向: 大运方向;
  /** 从出生时刻到最近一节折算的起运岁（精确到年+月）。 */
  起运岁: 起运岁;
  /** 8 柱大运。 */
  柱: 大运柱[];
}

/** 3 天折 1 年，即 1 天折 4 个月。用毫秒换算。 */
const MS_PER_DAY = 86_400_000;

/**
 * 判定大运方向。阳年（年干序号为偶：甲丙戊庚壬）男 / 阴年女顺行；
 * 阴年男 / 阳年女逆行。阳阴按年干序号奇偶：0,2,4,6,8 为阳，1,3,5,7,9 为阴。
 */
export function 判定大运方向(gender: 性别, yearGanIndex: number): 大运方向 {
  const isYangYear = yearGanIndex % 2 === 0;
  // 阳男、阴女顺；阴男、阳女逆
  const forward = isYangYear === (gender === "男");
  return forward ? "顺" : "逆";
}

/**
 * 找出生时刻方向侧最近一次"节"（交节时刻）：forward=true 取下一节（严格大于出生时刻），
 * forward=false 取上一节（严格小于出生时刻）。
 */
function findAdjacentJie(birthUtc: number, birthYear: number, forward: boolean): number {
  let best = forward ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  for (const year of [birthYear - 1, birthYear, birthYear + 1]) {
    for (const termIndex of JIE_TERM_INDEXES) {
      const ms = getSolarTermMoment(year, termIndex);
      if (forward) {
        if (ms > birthUtc && ms < best) best = ms;
      } else {
        if (ms < birthUtc && ms > best) best = ms;
      }
    }
  }
  return best;
}

/**
 * 折算起运岁：由出生时刻到最近一节的天数按 3 天折 1 年折算，
 * 精确到年+月（1 天 ≈ 4 个月）。
 */
function 折算起运岁(diffMs: number): 起运岁 {
  const totalDays = diffMs / MS_PER_DAY;
  // 3 天 = 1 年 = 12 月，故 1 天 = 4 月。总月数 = totalDays * 4。
  const totalMonths = totalDays * 4;
  const 岁 = Math.floor(totalMonths / 12);
  const 月 = Math.floor(totalMonths - 岁 * 12);
  return { 岁, 月 };
}

/**
 * 计算大运起运年月（公历）。第 0 柱起于"出生年 + 起运岁"所在公历年月，
 * 之后每柱递增 10 年。月份按起运岁中的月数加到出生月上。
 */
function computeStartYearMonth(
  birthYear: number,
  birthMonth: number,
  起运岁: 起运岁,
  柱序号: number,
): { year: number; month: number } {
  const totalStartMonths = (birthYear * 12 + (birthMonth - 1)) + 起运岁.岁 * 12 + 起运岁.月;
  const startMonths = totalStartMonths + 柱序号 * 120; // 每柱 10 年 = 120 月
  return {
    year: Math.floor(startMonths / 12),
    month: (startMonths % 12) + 1,
  };
}

/** 从月柱干支拆出月干序号与月支序号。 */
function splitPillar(pillar: string): { ganIdx: number; zhiIdx: number } {
  const gan = pillar.charAt(0);
  const zhi = pillar.charAt(1);
  const ganIdx = (天干 as readonly string[]).indexOf(gan);
  const zhiIdx = (地支 as readonly string[]).indexOf(zhi);
  if (ganIdx < 0 || zhiIdx < 0) {
    throw new Error(`非法干支柱：${pillar}`);
  }
  return { ganIdx, zhiIdx };
}

/**
 * 大运纯函数。
 *
 * @param 月柱 起点干支（如 "戊寅"）
 * @param yearGanIndex 年干序号（0=甲…9=癸），用于判定阳阴年
 * @param gender 性别
 * @param birthUtc 出生时刻 UTC 毫秒（已做经度修正后的真太阳时；无出生地则钟表时）
 * @param birthYear 出生公历年（用于圈定候选节范围）
 * @param birthMonth 出生公历月（用于起运年月起算）
 * @returns 大运完整结果（方向 + 起运岁 + 8 柱）
 */
export function 大运(
  月柱: string,
  yearGanIndex: number,
  gender: 性别,
  birthUtc: number,
  birthYear: number,
  birthMonth: number,
): 大运Result {
  const 方向 = 判定大运方向(gender, yearGanIndex);
  const forward = 方向 === "顺";
  const jieMs = findAdjacentJie(birthUtc, birthYear, forward);
  const diffMs = forward ? jieMs - birthUtc : birthUtc - jieMs;
  const 起运岁 = 折算起运岁(diffMs);

  const { ganIdx: monthGan, zhiIdx: monthZhi } = splitPillar(月柱);
  const step = forward ? 1 : -1;
  const 柱: 大运柱[] = [];
  for (let i = 0; i < 8; i++) {
    // 从月柱顺/逆推进 i+1 步。月柱本身是合法六十甲子（干支同进），故步进后干支
    // 奇偶仍匹配，可直接拼装。
    const ganIdx = (((monthGan + step * (i + 1)) % 10) + 10) % 10;
    const zhiIdx = (((monthZhi + step * (i + 1)) % 12) + 12) % 12;
    const 起年月 = computeStartYearMonth(birthYear, birthMonth, 起运岁, i);
    柱.push({
      序号: i,
      干支: `${天干[ganIdx]}${地支[zhiIdx]}`,
      起运岁: { 岁: 起运岁.岁 + i * 10, 月: 起运岁.月 },
      起年月,
    });
  }

  return { 方向, 起运岁, 柱 };
}