// 天干地支循环 - 仓库内自实现，无外部历法依赖
// 参照 CONTEXT.md 术语：天干、地支、六十甲子

/** 天干：甲乙丙丁戊己庚辛壬癸 */
export const 天干 = [
  "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸",
] as const;

/** 地支：子丑寅卯辰巳午未申酉戌亥 */
export const 地支 = [
  "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
] as const;

/** 六十甲子：天干与地支同步推进，60 组合一循环 */
export function 六十甲子(index: number): string {
  const i = ((index % 60) + 60) % 60;
  const gan = 天干[i % 10]!;
  const zhi = 地支[i % 12]!;
  return `${gan}${zhi}`;
}
