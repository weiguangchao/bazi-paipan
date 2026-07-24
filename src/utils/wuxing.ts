// 五行着色与十神简写：纯展示逻辑，不参与命理计算。
// 词汇遵循 CONTEXT.md（五行、十神、天干、地支）。
// 五行归属查询委托核心模块（src/wuxing.ts），本模块只做 Wuxing → CSS class 映射。
// 天干地支与十神全名用中文字面量匹配，不用对象属性名（ASCII 守卫要求）。

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

/** 五行文本配色 class，SizhuTable 与 DayunPanel 共用。 */
export const wuxingTextColors: Record<WuxingClass, string> = {
  wood: "text-green-600",
  fire: "text-red-600",
  earth: "text-amber-700",
  metal: "text-orange-600",
  water: "text-blue-500",
};

const shishenAbbrevMap: Readonly<Record<string, string>> = {
  "比肩": "比", "劫财": "劫", "食神": "食", "伤官": "伤", "偏财": "才",
  "正财": "财", "七杀": "杀", "正官": "官", "偏印": "枭", "正印": "印",
};

export function shishenAbbreviation(fullShishen: string): string {
  return shishenAbbrevMap[fullShishen] ?? fullShishen;
}