// 五行查询 - 排盘核心的命理事实层。
// 词汇遵循 CONTEXT.md：五行、天干、地支。
//
// 五行归属在此处唯一定义，展示层（lib/wuxing.ts）只做 Wuxing → CSS class 映射。
// 天干五行按序号 floor(idx/2) 推导（与 shishen.ts 的 tianganWuxingIndex 同一逻辑）；
// 地支五行以藏表方式锁定，辰戌丑未归土、亥子归水、寅卯归木、巳午归火、申酉归金。
// 非法字符显式抛错，不静默兜底。

import { tiangan, dizhi, type Tiangan, type Dizhi } from "./ganzhi.js";

/** 五行：木、火、土、金、水。 */
export type Wuxing = "木" | "火" | "土" | "金" | "水";

/** 天干五行序号到五行：0=木、1=火、2=土、3=金、4=水。 */
const wuxingByIndex: readonly Wuxing[] = ["木", "火", "土", "金", "水"];

/** 地支五行表：辰戌丑未土、亥子水、寅卯木、巳午火、申酉金。 */
const dizhiWuxingTable: Record<Dizhi, Wuxing> = {
  "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土",
  "巳": "火", "午": "火", "未": "土", "申": "金", "酉": "金",
  "戌": "土", "亥": "水",
};

/** 天干五行查询。甲乙木、丙丁火、戊己土、庚辛金、壬癸水。 */
export function tianganWuxing(character: Tiangan): Wuxing {
  const idx = (tiangan as readonly string[]).indexOf(character);
  if (idx < 0) {
    throw new Error(`非法天干：${character}`);
  }
  return wuxingByIndex[Math.floor(idx / 2)]!;
}

/** 地支五行查询。辰戌丑未土、亥子水、寅卯木、巳午火、申酉金。 */
export function dizhiWuxing(character: Dizhi): Wuxing {
  const wuxing = dizhiWuxingTable[character];
  if (!wuxing) {
    throw new Error(`非法地支：${character}`);
  }
  return wuxing;
}

/** 天干或地支的五行查询。非天干非地支的字符抛错，不静默兜底。 */
export function characterWuxing(character: Tiangan | Dizhi): Wuxing {
  if ((tiangan as readonly string[]).includes(character)) {
    return tianganWuxing(character as Tiangan);
  }
  if ((dizhi as readonly string[]).includes(character)) {
    return dizhiWuxing(character as Dizhi);
  }
  throw new Error(`非法天干地支：${character}`);
}