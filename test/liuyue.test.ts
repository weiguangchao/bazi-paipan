import { describe, expect, it } from "vitest";
import { liuyue } from "@/domain/paipan/liuyue";

describe("流月 - 五虎遁与十二柱顺序", () => {
  it.each([
    [2024, "甲辰", "丙寅"],
    [2025, "乙巳", "戊寅"],
    [2026, "丙午", "庚寅"],
    [2027, "丁未", "壬寅"],
    [2028, "戊申", "甲寅"],
    [2029, "己酉", "丙寅"],
    [2030, "庚戌", "戊寅"],
    [2031, "辛亥", "庚寅"],
    [2032, "壬子", "壬寅"],
    [2033, "癸丑", "甲寅"],
  ])("%i %s 年从 %s 起", (year, _liunianzhu, firstLiuyuezhu) => {
    expect(liuyue(year, 0)[0]!.ganzhi).toBe(firstLiuyuezhu);
  });

  it("甲年依次产出寅月至丑月十二个完整流月柱", () => {
    const result = liuyue(2024, 0);

    expect(result).toHaveLength(12);
    expect(result.map((item) => item.ganzhi)).toEqual([
      "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未",
      "壬申", "癸酉", "甲戌", "乙亥", "丙子", "丁丑",
    ]);
    expect(result.map((item) => item.startJie)).toEqual([
      "立春", "惊蛰", "清明", "立夏", "芒种", "小暑",
      "立秋", "白露", "寒露", "立冬", "大雪", "小寒",
    ]);
  });
});

describe("流月 - 交节区间", () => {
  it("最后一个丑月从下一公历年小寒起，持续至下一年立春前", () => {
    const result = liuyue(2024, 0);
    const lastLiuyuezhu = result[11]!;

    expect(new Date(lastLiuyuezhu.startUtcMs).toISOString()).toBe("2025-01-05T02:32:46.573Z");
    expect({ month: lastLiuyuezhu.startMonth, day: lastLiuyuezhu.startDay }).toEqual({ month: 1, day: 5 });
    expect(new Date(lastLiuyuezhu.endUtcMs).toISOString()).toBe("2025-02-03T14:10:28.427Z");
  });

  it("准确交节瞬间由寅月切换到卯月", () => {
    const transitionUtcMs = Date.UTC(2024, 2, 5, 2, 22, 44, 982);

    expect(liuyue(2024, transitionUtcMs - 1).find((item) => item.isCurrent)?.ganzhi).toBe("丙寅");
    expect(liuyue(2024, transitionUtcMs).find((item) => item.isCurrent)?.ganzhi).toBe("丁卯");
  });

  it("立春交节采用真实 UTC 时刻，卡片日期按北京时间显示", () => {
    const firstLiuyuezhu = liuyue(2024, 0)[0]!;

    expect(new Date(firstLiuyuezhu.startUtcMs).toISOString()).toBe("2024-02-04T08:27:06.834Z");
    expect({ month: firstLiuyuezhu.startMonth, day: firstLiuyuezhu.startDay }).toEqual({
      month: 2,
      day: 4,
    });
  });

  it("公历年初至立春前的当前流月标在上一流年的丑月", () => {
    const january = Date.UTC(2025, 0, 20);

    expect(liuyue(2024, january).find((item) => item.isCurrent)?.ganzhi).toBe("丁丑");
    expect(liuyue(2025, january).some((item) => item.isCurrent)).toBe(false);
  });
});
