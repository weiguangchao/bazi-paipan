// 流年纯函数（ADR-0003）
// "给定公历年起向后 10 柱干支"，由独立纯函数产出。
// 不注入 排盘Input、不进 排盘Result；排盘核心保持无时钟、纯函数不变。
//
// 每柱 = 六十甲子((公历年 - 4) mod 60)（甲子=0，2000 -> 庚辰）。
// 不查立春时刻，纯按公历年 mod 60（CONTEXT.md 流年术语）。

import { liushijiazi, type Ganzhi } from "@/domain/ganzhi/ganzhi";

/** 流年柱：年（公历）+ 该年干支。 */
export interface Liunianzhu {
  year: number;
  ganzhi: Ganzhi;
}

/** 流年输出长度：给定公历年起向后 10 柱。 */
const liunianzhuCount = 10;

/**
 * 流年纯函数：给定起始公历年，返回从该年起向后 10 柱干支。
 * 每柱 = 六十甲子((公历年 - 4) mod 60)，公历年每 +1，序号 +1。
 * 不查立春，纯按公历年 mod 60（CONTEXT.md）。
 *
 * 例：`流年(2024)` 返回从 2024 甲辰起的 10 柱。
 */
export function liunian(startGregorianYear: number): Liunianzhu[] {
  const zhu: Liunianzhu[] = [];
  for (let i = 0; i < liunianzhuCount; i++) {
    const year = startGregorianYear + i;
    const index = (((year - 4) % 60) + 60) % 60;
    zhu.push({ year, ganzhi: liushijiazi(index) });
  }
  return zhu;
}
