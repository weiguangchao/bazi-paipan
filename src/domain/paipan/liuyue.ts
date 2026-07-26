// 流月纯函数：给定流年公历年与当前 UTC 时刻，一次产出该流年的十二个流月柱。
// 流月从当年立春起，依次在十二个"节"的准确交节时刻切换，最后一柱丑月
// 从下一公历年小寒持续至下一年立春前。

import {
  dizhi,
  ganzhiFromCharacters,
  ganzhiTiangan,
  tiangan,
  type Ganzhi,
} from "@/domain/ganzhi/ganzhi";
import { liunianzhu } from "@/domain/paipan/liunian";
import { getSolarTermMoment, SOLAR_TERM_NAMES } from "@/domain/time/jieqi";

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

const liuyueJie = [
  { termIndex: 3, yearOffset: 0 },
  { termIndex: 5, yearOffset: 0 },
  { termIndex: 7, yearOffset: 0 },
  { termIndex: 9, yearOffset: 0 },
  { termIndex: 11, yearOffset: 0 },
  { termIndex: 13, yearOffset: 0 },
  { termIndex: 15, yearOffset: 0 },
  { termIndex: 17, yearOffset: 0 },
  { termIndex: 19, yearOffset: 0 },
  { termIndex: 21, yearOffset: 0 },
  { termIndex: 23, yearOffset: 0 },
  { termIndex: 1, yearOffset: 1 },
] as const;

export interface Liuyuezhu {
  ganzhi: Ganzhi;
  startJie: string;
  startUtcMs: number;
  endUtcMs: number;
  startMonth: number;
  startDay: number;
  isCurrent: boolean;
}

/**
 * 既有寿星 helper 用 UTC Date 字段承载北京时间墙钟值；流月的当前区间比较需要
 * 真实 UTC 毫秒，因此在此明确减去 UTC+8。显示月日时再按北京时间取墙钟日期。
 */
function jieUtcMs(year: number, termIndex: number): number {
  return getSolarTermMoment(year, termIndex) - BEIJING_OFFSET_MS;
}

/** 五虎遁：由流年柱年干确定寅月天干序号。 */
function liuyueStartTianganIndex(year: number): number {
  const yearTiangan = ganzhiTiangan(liunianzhu(year).ganzhi);
  const yearTianganIndex = tiangan.indexOf(yearTiangan);
  return ((yearTianganIndex % 5) * 2 + 2) % 10;
}

function beijingMonthDay(utcMs: number): { month: number; day: number } {
  const date = new Date(utcMs + BEIJING_OFFSET_MS);
  return { month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function liuyue(year: number, currentUtcMs: number): Liuyuezhu[] {
  const startTianganIndex = liuyueStartTianganIndex(year);
  const nextLichun = jieUtcMs(year + 1, 3);

  return liuyueJie.map(({ termIndex, yearOffset }, index) => {
    const startUtcMs = jieUtcMs(year + yearOffset, termIndex);
    const nextJie = liuyueJie[index + 1];
    const endUtcMs = nextJie
      ? jieUtcMs(year + nextJie.yearOffset, nextJie.termIndex)
      : nextLichun;
    const { month: startMonth, day: startDay } = beijingMonthDay(startUtcMs);

    return {
      ganzhi: ganzhiFromCharacters(
        tiangan[(startTianganIndex + index) % tiangan.length]!,
        dizhi[(2 + index) % dizhi.length]!,
      ),
      startJie: SOLAR_TERM_NAMES[termIndex]!,
      startUtcMs,
      endUtcMs,
      startMonth,
      startDay,
      isCurrent: currentUtcMs >= startUtcMs && currentUtcMs < endUtcMs,
    };
  });
}
