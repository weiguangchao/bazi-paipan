// 五行着色与十神简写：纯展示逻辑，不参与命理计算。
// 词汇遵循 CONTEXT.md（五行、十神、天干、地支）。
// 五行归属查询委托核心模块（src/domain/ganzhi/wuxing.ts），本模块只做 Wuxing → CSS class 映射。
// 天干地支与十神全名用中文字面量匹配，不用对象属性名（ASCII 守卫要求）。
//
// 配色：金/土/火原先挤在红橙暖簇（amber-700 / orange-600 / red-600），区分不明显。
// 现按 ADR-0005 把金推冷灰 slate-600、土推金黄 yellow-700，冷暖两极分开；对比度由 test/wuxing-colors.test.ts 守卫。
// emoji 作为颜色之外的独立第二信号：四柱天干/地支用，藏干与大运/流年干支不用。

import { characterWuxing, type Wuxing } from "@/domain/ganzhi/wuxing";
import type { Tiangan, Dizhi } from "@/domain/ganzhi/ganzhi";

export type WuxingClass = "wood" | "fire" | "earth" | "metal" | "water";

/** 五行（核心中文）到展示 CSS class 的映射。 */
const wuxingToClass: Record<Wuxing, WuxingClass> = {
  "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
};

/** 五行 CSS class 查询：委托核心五行查询再转 CSS class，非法字符由核心抛错。 */
export function getWuxing(character: string): WuxingClass {
  return wuxingToClass[characterWuxing(character as Tiangan | Dizhi)];
}

/** 五行文本配色 class。木=emerald、火=rose、土=yellow、金=slate、水=blue(均取 700/600 以达 AA 正文对比)。 */
export const wuxingTextColors: Record<WuxingClass, string> = {
  wood: "text-emerald-700",
  fire: "text-rose-700",
  earth: "text-yellow-700",
  metal: "text-slate-600",
  water: "text-blue-600",
};

/** 五行 emoji，仅四柱天干/地支用。木🪵 火🔥 土⛰️ 金🪙 水💧。 */
export const wuxingEmoji: Record<WuxingClass, string> = {
  wood: "🪵",
  fire: "🔥",
  earth: "⛰️",
  metal: "🪙",
  water: "💧",
};

const shishenAbbrevMap: Readonly<Record<string, string>> = {
  "比肩": "比", "劫财": "劫", "食神": "食", "伤官": "伤", "偏财": "才",
  "正财": "财", "七杀": "杀", "正官": "官", "偏印": "枭", "正印": "印",
};

export function shishenAbbreviation(fullShishen: string): string {
  return shishenAbbrevMap[fullShishen] ?? fullShishen;
}
