import { describe, expect, it } from "vitest";
import { personalInfo } from "@/domain/birth/personal-info";

describe("个人信息 - 生肖", () => {
  it.each([
    [2020, "鼠"],
    [2021, "牛"],
    [2022, "虎"],
    [2023, "兔"],
    [2024, "龙"],
    [2025, "蛇"],
    [2026, "马"],
    [2027, "羊"],
    [2028, "猴"],
    [2029, "鸡"],
    [2030, "狗"],
    [2031, "猪"],
  ] as const)("公历 %i 年对应生肖%s", (year, expectedShengxiao) => {
    expect(personalInfo({ year, month: 6, day: 15 }).shengxiao)
      .toBe(expectedShengxiao);
  });

  it("生肖在公历元旦切换，不等待立春或农历春节", () => {
    expect(personalInfo({ year: 2023, month: 12, day: 31 }).shengxiao).toBe("兔");
    expect(personalInfo({ year: 2024, month: 1, day: 1 }).shengxiao).toBe("龙");
  });

  it("每十二个公历年重复一次", () => {
    expect(personalInfo({ year: 2008, month: 1, day: 1 }).shengxiao).toBe("鼠");
    expect(personalInfo({ year: 2020, month: 1, day: 1 }).shengxiao).toBe("鼠");
  });
});

describe("个人信息 - 星座", () => {
  it.each([
    { before: { month: 1, day: 19 }, expectedBefore: "摩羯座", after: { month: 1, day: 20 }, expectedAfter: "水瓶座" },
    { before: { month: 2, day: 18 }, expectedBefore: "水瓶座", after: { month: 2, day: 19 }, expectedAfter: "双鱼座" },
    { before: { month: 3, day: 20 }, expectedBefore: "双鱼座", after: { month: 3, day: 21 }, expectedAfter: "白羊座" },
    { before: { month: 4, day: 19 }, expectedBefore: "白羊座", after: { month: 4, day: 20 }, expectedAfter: "金牛座" },
    { before: { month: 5, day: 20 }, expectedBefore: "金牛座", after: { month: 5, day: 21 }, expectedAfter: "双子座" },
    { before: { month: 6, day: 21 }, expectedBefore: "双子座", after: { month: 6, day: 22 }, expectedAfter: "巨蟹座" },
    { before: { month: 7, day: 22 }, expectedBefore: "巨蟹座", after: { month: 7, day: 23 }, expectedAfter: "狮子座" },
    { before: { month: 8, day: 22 }, expectedBefore: "狮子座", after: { month: 8, day: 23 }, expectedAfter: "处女座" },
    { before: { month: 9, day: 22 }, expectedBefore: "处女座", after: { month: 9, day: 23 }, expectedAfter: "天秤座" },
    { before: { month: 10, day: 23 }, expectedBefore: "天秤座", after: { month: 10, day: 24 }, expectedAfter: "天蝎座" },
    { before: { month: 11, day: 22 }, expectedBefore: "天蝎座", after: { month: 11, day: 23 }, expectedAfter: "射手座" },
    { before: { month: 12, day: 21 }, expectedBefore: "射手座", after: { month: 12, day: 22 }, expectedAfter: "摩羯座" },
  ])(
    "$expectedBefore 到 $expectedAfter 的交界日",
    ({ before, expectedBefore, after, expectedAfter }) => {
      expect(personalInfo({ year: 2000, ...before }).zodiacSign).toBe(expectedBefore);
      expect(personalInfo({ year: 2000, ...after }).zodiacSign).toBe(expectedAfter);
    },
  );
});
