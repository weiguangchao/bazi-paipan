import { describe, expect, it } from "vitest";
import { liuyue } from "@/domain/paipan/liuyue";
import { trueSolarDateTime } from "@/domain/time/date-time";
import { jieIntervals, locateJie } from "@/domain/time/jie-chronology";

function moment(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
) {
  return trueSolarDateTime({
    year, month, day, hour, minute, second, millisecond,
  });
}

function generateLiuyue(
  year: number,
  currentTime: ReturnType<typeof moment>,
  longitude?: number,
) {
  return liuyue(
    year,
    jieIntervals(year, longitude),
    locateJie(currentTime, longitude).interval,
  );
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
    expect(generateLiuyue(year, moment(year, 1, 1))[0]!.ganzhi).toBe(firstLiuyuezhu);
  });

  it("甲年依次产出寅月至丑月十二个完整流月柱", () => {
    const result = generateLiuyue(2024, moment(2024, 1, 1));

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
  it("只输出命盘消费的交节投影，不泄漏完整交节时刻", () => {
    const firstLiuyuezhu = generateLiuyue(2024, moment(2024, 1, 1))[0]!;

    expect(firstLiuyuezhu).toMatchObject({
      startJie: "立春",
      startMonth: 2,
      startDay: 4,
    });
    expect(firstLiuyuezhu).not.toHaveProperty("startTime");
    expect(firstLiuyuezhu).not.toHaveProperty("endTime");
  });

  it("最后一个丑月从下一公历年小寒起", () => {
    const result = generateLiuyue(2024, moment(2024, 1, 1));
    const lastLiuyuezhu = result[11]!;

    expect(lastLiuyuezhu).toMatchObject({
      startJie: "小寒",
      startMonth: 1,
      startDay: 5,
    });
  });

  it("交节前一毫秒、当毫秒与后一毫秒由寅月切换到卯月", () => {
    expect(generateLiuyue(2024, moment(2024, 3, 5, 10, 22, 44, 981))
      .find((item) => item.isCurrent)?.ganzhi).toBe("丙寅");
    expect(generateLiuyue(2024, moment(2024, 3, 5, 10, 22, 44, 982))
      .find((item) => item.isCurrent)?.ganzhi).toBe("丁卯");
    expect(generateLiuyue(2024, moment(2024, 3, 5, 10, 22, 44, 983))
      .find((item) => item.isCurrent)?.ganzhi).toBe("丁卯");
  });

  it("喀什交节跨公历日时展示同一真太阳时边界的月日", () => {
    const longitude = 75.996391;
    const result = generateLiuyue(
      1950,
      moment(1950, 7, 7, 22, 12, 32, 512),
      longitude,
    );
    const xiaoshu = result.find((item) => item.startJie === "小暑")!;

    expect({ month: xiaoshu.startMonth, day: xiaoshu.startDay })
      .toEqual({ month: 7, day: 7 });
    expect(xiaoshu.isCurrent).toBe(true);
  });

  it("公历年初至立春前的当前流月标在上一流年的丑月", () => {
    const january = moment(2025, 1, 20);

    expect(generateLiuyue(2024, january).find((item) => item.isCurrent)?.ganzhi).toBe("丁丑");
    expect(generateLiuyue(2025, january).some((item) => item.isCurrent)).toBe(false);
  });
});
