import type { BirthDateParts } from "../public/birth-date.js";

const shengxiaoCycle = [
  "鼠", "牛", "虎", "兔", "龙", "蛇",
  "马", "羊", "猴", "鸡", "狗", "猪",
] as const;

const zodiacSignBoundaries = [
  { day: 20, before: "摩羯座", after: "水瓶座" },
  { day: 19, before: "水瓶座", after: "双鱼座" },
  { day: 21, before: "双鱼座", after: "白羊座" },
  { day: 20, before: "白羊座", after: "金牛座" },
  { day: 21, before: "金牛座", after: "双子座" },
  { day: 22, before: "双子座", after: "巨蟹座" },
  { day: 23, before: "巨蟹座", after: "狮子座" },
  { day: 23, before: "狮子座", after: "处女座" },
  { day: 23, before: "处女座", after: "天秤座" },
  { day: 24, before: "天秤座", after: "天蝎座" },
  { day: 23, before: "天蝎座", after: "射手座" },
  { day: 22, before: "射手座", after: "摩羯座" },
] as const;

export type Shengxiao = (typeof shengxiaoCycle)[number];
export type ZodiacSign =
  (typeof zodiacSignBoundaries)[number]["before" | "after"];

export interface PersonalInfo {
  shengxiao: Shengxiao;
  zodiacSign: ZodiacSign;
}

/** 根据原始公历出生日期计算生肖与星座，不读取排盘后的有效时刻或年柱。 */
export function personalInfo(birthDate: BirthDateParts): PersonalInfo {
  const shengxiaoIndex = (((birthDate.year - 2020) % 12) + 12) % 12;
  const boundary = zodiacSignBoundaries[birthDate.month - 1]!;
  return {
    shengxiao: shengxiaoCycle[shengxiaoIndex]!,
    zodiacSign: birthDate.day < boundary.day ? boundary.before : boundary.after,
  };
}
