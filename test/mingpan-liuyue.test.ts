import { describe, expect, it } from "vitest";
import { parse } from "@/domain/birth/birth-profile";
import { mingpan } from "@/domain/paipan/mingpan";

function birthProfile() {
  const result = parse(
    { date: "2000-01-01", time: "12:00", gender: "男", province: "", city: "" },
    { year: 2025, month: 1 },
  );
  if (!result.ok) throw new Error("测试出生资料应合法");
  return result.value;
}

describe("命盘 - 完整流月嵌套", () => {
  it("十个大运各含十个流年，每个流年各含十二个流月", () => {
    const result = mingpan(birthProfile(), {
      year: 2025,
      month: 1,
      utcMs: Date.UTC(2025, 0, 20),
    });

    expect(result.dayun.zhu).toHaveLength(10);
    expect(result.dayun.zhu.every((dayunzhu) => dayunzhu.liunian.length === 10)).toBe(true);
    expect(
      result.dayun.zhu.every((dayunzhu) =>
        dayunzhu.liunian.every((liunianzhu) => liunianzhu.liuyue.length === 12),
      ),
    ).toBe(true);
  });

  it("立春前今年与当前流月分属 2025 和 2024 流年，并附加流月柱十神", () => {
    const result = mingpan(birthProfile(), {
      year: 2025,
      month: 1,
      utcMs: Date.UTC(2025, 0, 20),
    });
    const liunian = result.dayun.zhu.flatMap((dayunzhu) => dayunzhu.liunian);
    const year2024 = liunian.find((item) => item.year === 2024)!;
    const year2025 = liunian.find((item) => item.year === 2025)!;
    const currentLiuyue = liunian.flatMap((item) => item.liuyue).filter((item) => item.isCurrent);

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
    const now = {
      year: 2025,
      month: 1,
      utcMs: Date.UTC(2025, 0, 20),
    };
    const first = mingpan(birthProfile(), now);
    const second = mingpan(birthProfile(), now);
    const firstLiunianzhu = first.dayun.zhu[0]!.liunian[0]!;
    const secondLiunianzhu = second.dayun.zhu[0]!.liunian[0]!;
    const expectedFirstLiuyue = secondLiunianzhu.liuyue[0]!.ganzhi;

    firstLiunianzhu.liuyue[0]!.ganzhi = "甲子";
    firstLiunianzhu.liuyue.pop();

    expect(secondLiunianzhu.liuyue).toHaveLength(12);
    expect(secondLiunianzhu.liuyue[0]!.ganzhi).toBe(expectedFirstLiuyue);
  });
});
