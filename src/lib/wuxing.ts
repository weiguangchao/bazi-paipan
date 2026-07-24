// 五行着色与十神简写：纯展示逻辑，不参与命理计算。
// 词汇遵循 CONTEXT.md（五行、十神、天干、地支）。
// 天干地支与十神全名用中文字面量匹配，不用对象属性名（ASCII 守卫要求）。

export type WuxingClass = "wood" | "fire" | "earth" | "metal" | "water";

const wuxingMap: Readonly<Record<string, WuxingClass>> = {
  "甲": "wood", "乙": "wood", "寅": "wood", "卯": "wood",
  "丙": "fire", "丁": "fire", "巳": "fire", "午": "fire",
  "戊": "earth", "己": "earth", "辰": "earth", "戌": "earth", "丑": "earth", "未": "earth",
  "庚": "metal", "辛": "metal", "申": "metal", "酉": "metal",
  "壬": "water", "癸": "water", "子": "water", "亥": "water",
};

export function getWuxing(character: string): WuxingClass {
  return wuxingMap[character] ?? "earth";
}

const shishenAbbrevMap: Readonly<Record<string, string>> = {
  "比肩": "比", "劫财": "劫", "食神": "食", "伤官": "伤", "偏财": "才",
  "正财": "财", "七杀": "杀", "正官": "官", "偏印": "枭", "正印": "印",
};

export function shishenAbbreviation(fullShishen: string): string {
  return shishenAbbrevMap[fullShishen] ?? fullShishen;
}
