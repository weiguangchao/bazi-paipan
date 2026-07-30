// 流月纯函数：给定流年公历年、当前真太阳时与出生地经度，一次产出十二个流月柱。
// 流月从出生地真太阳时立春起，依次在十二个"节"的准确交节时刻切换，最后一柱丑月
// 从下一公历年小寒持续至下一年立春前。

import {
  dizhi,
  ganzhiFromCharacters,
  ganzhiTiangan,
  tiangan,
  type Ganzhi,
} from "@/domain/ganzhi/ganzhi";
import { liunianzhu } from "@/domain/paipan/liunian";
import {
  type TrueSolarDateTime,
} from "@/domain/time/date-time";
import {
  locateTrueSolarJie,
  trueSolarJieIntervals,
  type TrueSolarJieOccurrence,
} from "@/domain/time/jie-chronology";

export interface Liuyuezhu {
  ganzhi: Ganzhi;
  startJie: TrueSolarJieOccurrence["jie"];
  startTime: TrueSolarDateTime;
  endTime: TrueSolarDateTime;
  startMonth: number;
  startDay: number;
  isCurrent: boolean;
}

/** 五虎遁：由流年柱年干确定寅月天干序号。 */
function liuyueStartTianganIndex(year: number): number {
  const yearTiangan = ganzhiTiangan(liunianzhu(year).ganzhi);
  const yearTianganIndex = tiangan.indexOf(yearTiangan);
  return ((yearTianganIndex % 5) * 2 + 2) % 10;
}

export function liuyue(
  year: number,
  currentTime: TrueSolarDateTime,
  longitude?: number,
): Liuyuezhu[] {
  const intervals = trueSolarJieIntervals(year, longitude);
  const currentInterval = locateTrueSolarJie(currentTime, longitude).interval;
  const startTianganIndex = liuyueStartTianganIndex(year);

  return intervals.map((interval, index) => {
    const startTime = interval.start.moment;
    const endTime = interval.end.moment;

    return {
      ganzhi: ganzhiFromCharacters(
        tiangan[(startTianganIndex + index) % tiangan.length]!,
        dizhi[(2 + index) % dizhi.length]!,
      ),
      startJie: interval.start.jie,
      startTime,
      endTime,
      startMonth: startTime.month,
      startDay: startTime.day,
      isCurrent:
        interval.lichunYear === currentInterval.lichunYear
        && interval.start.jie === currentInterval.start.jie,
    };
  });
}
