import { describe, expect, expectTypeOf, it } from "vitest";
import {
  jieIntervals,
  locateJie,
  type JieInterval,
  type JieLocation,
  type JieOccurrence,
} from "@/domain/time/jie-chronology";
import type { Jie } from "@/domain/time/astronomy";
import { beijingDateTime, type BeijingDateTime } from "@/domain/time/date-time";

describe("Jie chronology - 完整立春周期", () => {
  it("固定返回从立春到小寒的十二个连续区间，并结束于下一次立春", () => {
    const intervals = jieIntervals(2024);

    expect(intervals).toHaveLength(12);
    expect(intervals.map((interval) => interval.start.jie)).toEqual([
      "立春", "惊蛰", "清明", "立夏", "芒种", "小暑",
      "立秋", "白露", "寒露", "立冬", "大雪", "小寒",
    ]);
    expect(intervals.every((interval) => interval.lichunYear === 2024)).toBe(true);
    for (let index = 0; index < intervals.length - 1; index++) {
      expect(intervals[index]!.end).toEqual(intervals[index + 1]!.start);
    }
    expect(intervals[11]).toMatchObject({
      start: {
        jie: "小寒",
        moment: { year: 2025, month: 1, day: 5, hour: 10, minute: 32, second: 47 },
      },
      end: {
        jie: "立春",
        moment: { year: 2025, month: 2, day: 3, hour: 22, minute: 10, second: 28 },
      },
    });
  });

  it("occurrence、interval、location 与周期结果均为 readonly 数据", () => {
    expectTypeOf<JieOccurrence>().toEqualTypeOf<Readonly<{
      jie: Jie;
      moment: BeijingDateTime;
    }>>();
    expectTypeOf<JieInterval>().toEqualTypeOf<Readonly<{
      lichunYear: number;
      start: JieOccurrence;
      end: JieOccurrence;
    }>>();
    expectTypeOf<JieLocation>().toEqualTypeOf<Readonly<{
      interval: JieInterval;
      strictEarlier: JieOccurrence;
      strictLater: JieOccurrence;
    }>>();
    expectTypeOf<ReturnType<typeof jieIntervals>>()
      .toEqualTypeOf<readonly JieInterval[]>();
  });

  it("周期年份只要求整数，非整数抛 RangeError", () => {
    expect(() => jieIntervals(2024.5)).toThrow(RangeError);
  });

  it("2099 周期自然派生至 2100，且超过 2099 的周期仍可生成", () => {
    const endpointCycle = jieIntervals(2099);
    const derivedCycle = jieIntervals(2100);

    expect(endpointCycle[11]!.end).toMatchObject({
      jie: "立春",
      moment: { year: 2100 },
    });
    expect(derivedCycle).toHaveLength(12);
    expect(derivedCycle[0]).toMatchObject({
      lichunYear: 2100,
      start: { jie: "立春", moment: { year: 2100 } },
    });
    expect(derivedCycle[11]!.end.moment.year).toBe(2101);
  });
});

describe("Jie chronology - 时刻定位", () => {
  it("交节前一秒、当秒与后一秒遵守半开区间及严格相邻语义", () => {
    const before = locateJie(beijingDateTime({
      year: 2024, month: 3, day: 5, hour: 10, minute: 22, second: 44,
    }));
    const at = locateJie(beijingDateTime({
      year: 2024, month: 3, day: 5, hour: 10, minute: 22, second: 45,
    }));
    const after = locateJie(beijingDateTime({
      year: 2024, month: 3, day: 5, hour: 10, minute: 22, second: 46,
    }));
    const intervals = jieIntervals(2024);

    expect(before.interval).toEqual(intervals[0]);
    expect(at.interval).toEqual(intervals[1]);
    expect(after.interval).toEqual(intervals[1]);
    expect({
      current: before.interval.start.jie,
      earlier: before.strictEarlier.jie,
      later: before.strictLater.jie,
    }).toEqual({ current: "立春", earlier: "立春", later: "惊蛰" });
    expect({
      current: at.interval.start.jie,
      earlier: at.strictEarlier.jie,
      later: at.strictLater.jie,
    }).toEqual({ current: "惊蛰", earlier: "立春", later: "清明" });
    expect({
      current: after.interval.start.jie,
      earlier: after.strictEarlier.jie,
      later: after.strictLater.jie,
    }).toEqual({ current: "惊蛰", earlier: "惊蛰", later: "清明" });
  });

  it("1801 年初定位到上一立春周期，并能取得跨正式端点的相邻 Jie", () => {
    const location = locateJie(beijingDateTime({
      year: 1801, month: 1, day: 1, hour: 0, minute: 0, second: 0,
    }));

    expect(location).toMatchObject({
      interval: {
        lichunYear: 1800,
        start: { jie: "大雪", moment: { year: 1800 } },
        end: { jie: "小寒", moment: { year: 1801 } },
      },
      strictEarlier: { jie: "大雪", moment: { year: 1800 } },
      strictLater: { jie: "小寒", moment: { year: 1801 } },
    });
  });

  it("立春当秒的 strict earlier 跨周期指向小寒，strict later 指向惊蛰", () => {
    const location = locateJie(beijingDateTime({
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 7,
    }));

    expect(location).toMatchObject({
      interval: { lichunYear: 2024, start: { jie: "立春" } },
      strictEarlier: { jie: "小寒", moment: { year: 2024 } },
      strictLater: { jie: "惊蛰", moment: { year: 2024 } },
    });
  });
});
