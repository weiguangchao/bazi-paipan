import { describe, expect, it } from "vitest";
import { liuyue } from "@/domain/paipan/liuyue";
import { beijingDateTime } from "@/domain/time/date-time";

function moment(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  return beijingDateTime({ year, month, day, hour, minute, second });
}

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
    expect(liuyue(year, moment(year, 1, 1))[0]!.ganzhi).toBe(firstLiuyuezhu);
  });

  it("甲年依次产出寅月至丑月十二个完整流月柱", () => {
    const result = liuyue(2024, moment(2024, 1, 1));

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
    const result = liuyue(2024, moment(2024, 1, 1));
    const lastLiuyuezhu = result[11]!;

    expect(lastLiuyuezhu.startTime).toMatchObject({
      year: 2025, month: 1, day: 5, hour: 10, minute: 32, second: 47,
    });
    expect({ month: lastLiuyuezhu.startMonth, day: lastLiuyuezhu.startDay }).toEqual({ month: 1, day: 5 });
    expect(lastLiuyuezhu.endTime).toMatchObject({
      year: 2025, month: 2, day: 3, hour: 22, minute: 10, second: 28,
    });
  });

  it("准确交节瞬间由寅月切换到卯月", () => {
    expect(liuyue(2024, moment(2024, 3, 5, 10, 22, 44)).find((item) => item.isCurrent)?.ganzhi).toBe("丙寅");
    expect(liuyue(2024, moment(2024, 3, 5, 10, 22, 45)).find((item) => item.isCurrent)?.ganzhi).toBe("丁卯");
    expect(liuyue(2024, moment(2024, 3, 5, 10, 22, 46)).find((item) => item.isCurrent)?.ganzhi).toBe("丁卯");
  });

  it("立春交节直接使用北京时间值对象", () => {
    const firstLiuyuezhu = liuyue(2024, moment(2024, 1, 1))[0]!;

    expect(firstLiuyuezhu.startTime).toMatchObject({
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 7,
    });
    expect({ month: firstLiuyuezhu.startMonth, day: firstLiuyuezhu.startDay }).toEqual({
      month: 2,
      day: 4,
    });
  });

  it("公历年初至立春前的当前流月标在上一流年的丑月", () => {
    const january = moment(2025, 1, 20);

    expect(liuyue(2024, january).find((item) => item.isCurrent)?.ganzhi).toBe("丁丑");
    expect(liuyue(2025, january).some((item) => item.isCurrent)).toBe(false);
  });
});
