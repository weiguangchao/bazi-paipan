// 流月纯函数：给定流年公历年与当前钟表时，一次产出该流年的十二个流月柱。
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
import {
  compareDateTime,
  type BeijingDateTime,
} from "@/domain/time/date-time";
import {
  JIE_NAMES,
  jieMoment,
  type Jie,
} from "@/domain/time/astronomy";

const liuyueJie = JIE_NAMES.map((jie) => ({
  jie,
  yearOffset: jie === "小寒" ? 1 : 0,
}));

export interface Liuyuezhu {
  ganzhi: Ganzhi;
  startJie: Jie;
  startTime: BeijingDateTime;
  endTime: BeijingDateTime;
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

export function liuyue(year: number, currentTime: BeijingDateTime): Liuyuezhu[] {
  const startTianganIndex = liuyueStartTianganIndex(year);
  const nextLichun = jieMoment(year + 1, "立春");

  return liuyueJie.map(({ jie, yearOffset }, index) => {
    const startTime = jieMoment(year + yearOffset, jie);
    const nextJie = liuyueJie[index + 1];
    const endTime = nextJie
      ? jieMoment(year + nextJie.yearOffset, nextJie.jie)
      : nextLichun;

    return {
      ganzhi: ganzhiFromCharacters(
        tiangan[(startTianganIndex + index) % tiangan.length]!,
        dizhi[(2 + index) % dizhi.length]!,
      ),
      startJie: jie,
      startTime,
      endTime,
      startMonth: startTime.month,
      startDay: startTime.day,
      isCurrent:
        compareDateTime(currentTime, startTime) >= 0
        && compareDateTime(currentTime, endTime) < 0,
    };
  });
}
