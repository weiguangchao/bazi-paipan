// 十神纯函数 - 排盘的组合层。
// 词汇遵循 CONTEXT.md：日主、十神、藏干。
//
// 十神由日主与目标天干的五行 + 阴阳关系推出，共十种角色：
//   比肩、劫财（同五行）、食神、伤官（我生）、偏财、正财（我克）、
//   七杀、正官（克我）、偏印、正印（生我）。
// 阴阳按天干序号偶阳奇阴；同阴阳取前者、异阴阳取后者。
// 藏干表锁定（不标本气/中气/余气），每个地支 1-3 个藏干。
// 日主位标 "日主" 是 CLI 层叠加（见 src/index.ts），纯函数始终返回十神规则结果。
// 排盘核心与排盘Result 不动：日主从 日柱 天干读，十神作为 CLI/组合层后置步骤。

import { tiangan, dizhi } from "./ganzhi.js";

/** 天干五行序号：0=木、1=火、2=土、3=金、4=水。甲乙木、丙丁火、戊己土、庚辛金、壬癸水。 */
function ganWuxingIndex(gan: string): number {
  const idx = (tiangan as readonly string[]).indexOf(gan);
  if (idx < 0) {
    throw new Error(`非法天干：${gan}`);
  }
  // 甲乙(0,1)->木(0)、丙丁(2,3)->火(1)、戊己(4,5)->土(2)、庚辛(6,7)->金(3)、壬癸(8,9)->水(4)
  return Math.floor(idx / 2);
}

/** 天干阴阳：序号偶为阳(0)、奇为阴(1)。 */
function ganYinYang(gan: string): 0 | 1 {
  const idx = (tiangan as readonly string[]).indexOf(gan);
  if (idx < 0) {
    throw new Error(`非法天干：${gan}`);
  }
  return (idx % 2) as 0 | 1;
}

/**
 * 锁定藏干表（不标本气/中气/余气）。每个地支 1-3 个藏干。
 * 子癸；丑己癸辛；寅甲丙戊；卯乙；辰戊乙癸；巳丙戊庚；午丁己；
 * 未己丁乙；申庚壬戊；酉辛；戌戊辛丁；亥壬甲。
 */
export const cangganTable: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "戊", "庚"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

/** 十神结果：天干位的十神 + 地支藏干位（按藏干顺序）的十神数组。 */
export interface ShishenResult {
  /** 干支天干相对日主的十神。 */
  tianganShishen: string;
  /** 干支地支的藏干各自相对日主的十神，顺序与藏干表一致。 */
  cangganShishen: string[];
}

/**
 * 十神关系表：以 (目标五行 - 日主五行 + 5) mod 5 为索引。
 * 五行生克：木生火、火生土、土生金、金生水、水生木；
 *           木克土、土克水、水克火、火克金、金克木。
 *   diff=0 同五行 -> 比肩/劫财
 *   diff=1 我生   -> 食神/伤官
 *   diff=2 我克   -> 偏财/正财
 *   diff=3 克我   -> 七杀/正官
 *   diff=4 生我   -> 偏印/正印
 * 每项 [同阴阳, 异阴阳]：同阴阳取前者、异阴阳取后者。
 */
const 十神关系表: [string, string][] = [
  ["比肩", "劫财"], // 0 同五行
  ["食神", "伤官"], // 1 我生
  ["偏财", "正财"], // 2 我克
  ["七杀", "正官"], // 3 克我
  ["偏印", "正印"], // 4 生我
];

/**
 * 计算目标天干相对日主的十神。
 * @param 日主天干 日柱天干（"我"）
 * @param 目标天干 任意天干
 * @returns 十神名称（十种之一）
 */
function 推十神(dayMasterTiangan: string, 目标天干: string): string {
  const a = ganWuxingIndex(dayMasterTiangan);
  const b = ganWuxingIndex(目标天干);
  const diff = (b - a + 5) % 5;
  const [同阴阳, 异阴阳] = 十神关系表[diff]!;
  return ganYinYang(dayMasterTiangan) === ganYinYang(目标天干) ? 同阴阳 : 异阴阳;
}

/**
 * 十神纯函数：对日主天干 + 任意干支返回 { 天干十神, 藏干十神[] }。
 *
 * 天干十神为干支天干相对日主的十神；藏干十神为干支地支藏干（按藏干表顺序）
 * 各自相对日主的十神。日主位标 "日主" 不在此处处理--纯函数始终返回十神规则
 * 结果，"日主" 标记由 CLI 层依据干支是否为日柱叠加。
 *
 * @param 日主天干 日柱天干（"我"），如 "戊"
 * @param 干支 两字干支，如 "庚辰"
 * @returns 天干十神 + 藏干十神数组
 */
export function shishen(dayMasterTiangan: string, ganzhi: string): ShishenResult {
  if (ganzhi.length !== 2) {
    throw new Error(`非法干支：${ganzhi}`);
  }
  const gan = ganzhi.charAt(0);
  const zhi = ganzhi.charAt(1);
  if (!(tiangan as readonly string[]).includes(gan)) {
    throw new Error(`非法天干：${gan}`);
  }
  if (!(dizhi as readonly string[]).includes(zhi)) {
    throw new Error(`非法地支：${zhi}`);
  }
  const canggan = cangganTable[zhi]!;
  return {
    tianganShishen: 推十神(dayMasterTiangan, gan),
    cangganShishen: canggan.map((g) => 推十神(dayMasterTiangan, g)),
  };
}
