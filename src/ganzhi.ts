// 天干地支循环 - 仓库内自实现，无外部历法依赖
// 参照 CONTEXT.md 术语：天干、地支、六十甲子

/** 天干：甲乙丙丁戊己庚辛壬癸 */
export const tiangan = [
  "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸",
] as const;

/** 地支：子丑寅卯辰巳午未申酉戌亥 */
export const dizhi = [
  "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
] as const;

/** 六十甲子：天干与地支同步推进，60 组合一循环 */
export function liushijiazi(index: number): string {
  const i = ((index % 60) + 60) % 60;
  const gan = tiangan[i % 10]!;
  const zhi = dizhi[i % 12]!;
  return `${gan}${zhi}`;
}

/**
 * 节（非中气）的节气序号，顺序与 SOLAR_TERM_NAMES 一致：
 * 立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒。
 * 月柱与大运起运岁都以"节"为切换点，两处共用。
 */
export const JIE_TERM_INDEXES = [
  3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 1,
] as const;
