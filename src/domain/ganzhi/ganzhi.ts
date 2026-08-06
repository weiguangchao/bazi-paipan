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

export type Tiangan = (typeof tiangan)[number];
export type Dizhi = (typeof dizhi)[number];

type EvenIndexTiangan = (typeof tiangan)[0 | 2 | 4 | 6 | 8];
type OddIndexTiangan = (typeof tiangan)[1 | 3 | 5 | 7 | 9];
type EvenIndexDizhi = (typeof dizhi)[0 | 2 | 4 | 6 | 8 | 10];
type OddIndexDizhi = (typeof dizhi)[1 | 3 | 5 | 7 | 9 | 11];

/** 六十甲子合法组合；阴阳奇偶同步，排除甲丑一类非法拼接。 */
export type Ganzhi =
  | `${EvenIndexTiangan}${EvenIndexDizhi}`
  | `${OddIndexTiangan}${OddIndexDizhi}`;

/** 六十甲子：天干与地支同步推进，60 组合一循环 */
export function liushijiazi(index: number): Ganzhi {
  if (!Number.isInteger(index)) {
    throw new RangeError(`liushijiazi index 必须是整数：${String(index)}`);
  }
  const i = ((index % 60) + 60) % 60;
  const tianganCharacter = tiangan[i % 10]!;
  const dizhiCharacter = dizhi[i % 12]!;
  return `${tianganCharacter}${dizhiCharacter}` as Ganzhi;
}

const liushijiaziValues: ReadonlySet<string> = new Set(
  Array.from({ length: 60 }, (_, index) => liushijiazi(index)),
);

export function isTiangan(value: unknown): value is Tiangan {
  return typeof value === "string" && (tiangan as readonly string[]).includes(value);
}

export function isDizhi(value: unknown): value is Dizhi {
  return typeof value === "string" && (dizhi as readonly string[]).includes(value);
}

export function isGanzhi(value: unknown): value is Ganzhi {
  return typeof value === "string" && liushijiaziValues.has(value);
}

export function assertGanzhi(value: unknown, fieldName = "ganzhi"): asserts value is Ganzhi {
  if (!isGanzhi(value)) {
    throw new RangeError(`${fieldName} 不是合法干支：${String(value)}`);
  }
}

/** 从规范字符构造干支，并在运行时守住完整六十甲子边界。 */
export function ganzhiFromCharacters(
  tianganCharacter: Tiangan,
  dizhiCharacter: Dizhi,
): Ganzhi {
  const value = `${tianganCharacter}${dizhiCharacter}`;
  assertGanzhi(value);
  return value;
}

export function ganzhiTiangan(value: Ganzhi): Tiangan {
  assertGanzhi(value);
  const tianganCharacter = value.charAt(0);
  if (!isTiangan(tianganCharacter)) {
    throw new RangeError(`ganzhi 不含规范天干：${value}`);
  }
  return tianganCharacter;
}

export function ganzhiDizhi(value: Ganzhi): Dizhi {
  assertGanzhi(value);
  const dizhiCharacter = value.charAt(1);
  if (!isDizhi(dizhiCharacter)) {
    throw new RangeError(`ganzhi 不含规范地支：${value}`);
  }
  return dizhiCharacter;
}
