import { describe, expect, expectTypeOf, it } from "vitest";
import { parse, type BirthProfile } from "@/domain/birth/birth-profile";
import { mingpan } from "@/domain/paipan/mingpan";
import { beijingDateTime, type BeijingDateTime } from "@/domain/time/date-time";

const NOW = beijingDateTime({
  year: 2025, month: 1, day: 20, hour: 8, minute: 0, second: 0,
});

function birthProfile() {
  const result = parse(
    { date: "2000-01-01", time: "12:00", gender: "男", province: "", city: "" },
  );
  if (!result.ok) throw new Error("测试出生资料应合法");
  return result.value;
}

describe("命盘 - 完整流月嵌套", () => {
  it("公开输入只包含 BirthProfile 与 BeijingDateTime", () => {
    expectTypeOf(mingpan).parameters.toEqualTypeOf<[BirthProfile, BeijingDateTime]>();
  });

  it("十个大运各含十个流年，每个流年各含十二个流月", () => {
    const result = mingpan(birthProfile(), NOW);

    expect(result.dayun.zhu).toHaveLength(10);
    expect(result.dayun.zhu.every((dayunzhu) => dayunzhu.liunian.length === 10)).toBe(true);
    expect(
      result.dayun.zhu.every((dayunzhu) =>
        dayunzhu.liunian.every((liunianzhu) => liunianzhu.liuyue.length === 12),
      ),
    ).toBe(true);
  });

  it("真太阳时跨年或跨星座日期时仍按原始公历出生日期生成个人信息", () => {
    const kashgar = {
      province: "新疆维吾尔自治区",
      city: "喀什地区",
    };
    const newYear = mingpan({
      year: 2024, month: 1, day: 1, hour: 0, minute: 30,
      gender: "男",
      birthplace: kashgar,
    }, NOW);
    const zodiacBoundary = mingpan({
      year: 2024, month: 3, day: 21, hour: 0, minute: 30,
      gender: "男",
      birthplace: kashgar,
    }, NOW);

    expect(newYear.personal).toEqual({ shengxiao: "龙", zodiacSign: "摩羯座" });
    expect(zodiacBoundary.personal.zodiacSign).toBe("白羊座");
  });

  it("同一时刻派生当前大运、今年及立春前仍属 2024 流年的当前流月", () => {
    const result = mingpan(birthProfile(), NOW);
    const liunian = result.dayun.zhu.flatMap((dayunzhu) => dayunzhu.liunian);
    const year2024 = liunian.find((item) => item.year === 2024)!;
    const year2025 = liunian.find((item) => item.year === 2025)!;
    const currentDayun = result.dayun.zhu.filter((item) => item.isCurrent);
    const currentLiuyue = liunian.flatMap((item) => item.liuyue).filter((item) => item.isCurrent);

    expect(currentDayun).toHaveLength(1);
    expect(currentDayun[0]).toMatchObject({ startYear: 2018, startMonth: 3 });
    expect(year2024.isCurrentYear).toBe(false);
    expect(year2025.isCurrentYear).toBe(true);
    expect(year2025.liuyue.some((item) => item.isCurrent)).toBe(false);
    expect(currentLiuyue).toHaveLength(1);
    expect(currentLiuyue[0]).toMatchObject({
      ganzhi: "丁丑",
      startJie: "小寒",
      startMonth: 1,
      startDay: 5,
      tianganShishen: "正印",
      dizhiShishen: "劫财",
      isCurrent: true,
    });
  });

  it("跨调用的流年与流月不共享可变对象", () => {
    const first = mingpan(birthProfile(), NOW);
    const second = mingpan(birthProfile(), NOW);
    const firstLiunianzhu = first.dayun.zhu[0]!.liunian[0]!;
    const secondLiunianzhu = second.dayun.zhu[0]!.liunian[0]!;
    const expectedFirstLiuyue = secondLiunianzhu.liuyue[0]!.ganzhi;

    firstLiunianzhu.liuyue[0]!.ganzhi = "甲子";
    firstLiunianzhu.liuyue.pop();

    expect(secondLiunianzhu.liuyue).toHaveLength(12);
    expect(secondLiunianzhu.liuyue[0]!.ganzhi).toBe(expectedFirstLiuyue);
  });
});
