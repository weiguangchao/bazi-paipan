import { describe, expect, expectTypeOf, it } from "vitest";
import {
  jieIntervals,
  locateJie,
  type JieInterval,
  type JieLocation,
  type JieOccurrence,
} from "@/domain/time/jie-chronology";
import type { Jie } from "@/domain/time/astronomy";
import {
  trueSolarDateTime,
  type TrueSolarDateTime,
} from "@/domain/time/date-time";

describe("Jie chronology - 完整立春周期", () => {
  it("固定返回从立春到小寒的十二个连续真太阳时区间", () => {
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
        moment: {
          year: 2025, month: 1, day: 5, hour: 10, minute: 32, second: 46,
          millisecond: 573,
        },
      },
      end: {
        jie: "立春",
        moment: {
          year: 2025, month: 2, day: 3, hour: 22, minute: 10, second: 28,
          millisecond: 427,
        },
      },
    });
  });

  it("occurrence、interval、location 与周期结果均为 readonly 真太阳时数据", () => {
    expectTypeOf<JieOccurrence>().toEqualTypeOf<Readonly<{
      jie: Jie;
      moment: TrueSolarDateTime;
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

describe("Jie chronology - 真太阳时时刻定位", () => {
  it("交节前一毫秒、当毫秒与后一毫秒遵守半开区间", () => {
    const fields = {
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 6,
    };
    const before = locateJie(
      trueSolarDateTime({ ...fields, millisecond: 833 }),
    );
    const at = locateJie(
      trueSolarDateTime({ ...fields, millisecond: 834 }),
    );
    const after = locateJie(
      trueSolarDateTime({ ...fields, millisecond: 835 }),
    );

    expect(before.interval.start.jie).toBe("小寒");
    expect(at.interval.start.jie).toBe("立春");
    expect(after.interval.start.jie).toBe("立春");
    expect(at.strictEarlier.jie).toBe("小寒");
    expect(at.strictLater.jie).toBe("惊蛰");
  });

  it("使用同一出生地的交节边界", () => {
    const location = locateJie(trueSolarDateTime({
      year: 2024, month: 2, day: 4, hour: 15, minute: 9, second: 34,
      millisecond: 253,
    }), 104.0668);

    expect(location.interval).toMatchObject({
      lichunYear: 2024,
      start: {
        jie: "立春",
        moment: { hour: 15, minute: 9, second: 34, millisecond: 253 },
      },
    });
  });

  it("1801 年初定位到上一立春周期并取得跨正式端点的相邻 Jie", () => {
    const location = locateJie(trueSolarDateTime({
      year: 1801, month: 1, day: 1, hour: 0, minute: 0, second: 0,
      millisecond: 0,
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

  it("立春当毫秒的严格前后相邻分别指向小寒与惊蛰", () => {
    const location = locateJie(trueSolarDateTime({
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 6,
      millisecond: 834,
    }));

    expect(location).toMatchObject({
      interval: { lichunYear: 2024, start: { jie: "立春" } },
      strictEarlier: { jie: "小寒", moment: { year: 2024 } },
      strictLater: { jie: "惊蛰", moment: { year: 2024 } },
    });
  });
});
