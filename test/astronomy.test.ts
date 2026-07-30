import { describe, expect, it } from "vitest";
import {
  addMilliseconds,
  addSeconds,
  beijingDateTime,
  compareDateTime,
  diffSeconds,
  trueSolarDateTime,
} from "@/domain/time/date-time";
import {
  jieMoment,
  trueSolarJieMoment,
  toTrueSolarDateTime,
} from "@/domain/time/astronomy";

describe("BeijingDateTime", () => {
  it("接受正式范围边界并拒绝范围外与非法日期", () => {
    expect(beijingDateTime({
      year: 1801, month: 1, day: 1, hour: 0, minute: 0, second: 0,
    })).toMatchObject({ year: 1801, month: 1, day: 1 });
    expect(beijingDateTime({
      year: 2099, month: 12, day: 31, hour: 23, minute: 59, second: 59,
    })).toMatchObject({ year: 2099, month: 12, day: 31 });
    expect(() => beijingDateTime({
      year: 1800, month: 12, day: 31, hour: 23, minute: 59, second: 59,
    })).toThrow(RangeError);
    expect(() => beijingDateTime({
      year: 2100, month: 1, day: 1, hour: 0, minute: 0, second: 0,
    })).toThrow(RangeError);
    expect(() => beijingDateTime({
      year: 2024, month: 2, day: 30, hour: 0, minute: 0, second: 0,
    })).toThrow(RangeError);
  });

  it("比较、求差与加秒正确处理跨月和跨年进位", () => {
    const before = beijingDateTime({
      year: 2024, month: 12, day: 31, hour: 23, minute: 59, second: 59,
    });
    const after = addSeconds(before, 1);
    expect(after).toMatchObject({
      year: 2025, month: 1, day: 1, hour: 0, minute: 0, second: 0,
    });
    expect(compareDateTime(before, after)).toBe(-1);
    expect(diffSeconds(after, before)).toBe(1);
  });

  it("TrueSolarDateTime 是毫秒级纯时间值并正确处理所有日历进位", () => {
    const value = trueSolarDateTime({
      year: 2024, month: 12, day: 31, hour: 23, minute: 59, second: 59,
      millisecond: 999,
    });
    const nextMillisecond = addMilliseconds(value, 1);
    expect(nextMillisecond).toEqual({
      year: 2025, month: 1, day: 1, hour: 0, minute: 0, second: 0,
      millisecond: 0,
    });
    expect(compareDateTime(value, nextMillisecond)).toBe(-1);
    expect(diffSeconds(nextMillisecond, value)).toBe(0.001);
    expect(addSeconds(nextMillisecond, 60)).toEqual({
      year: 2025, month: 1, day: 1, hour: 0, minute: 1, second: 0,
      millisecond: 0,
    });
  });

  it("TrueSolarDateTime 拒绝非整数或越界毫秒", () => {
    const fields = {
      year: 2024, month: 1, day: 1, hour: 0, minute: 0, second: 0,
    };
    expect(() => trueSolarDateTime({ ...fields, millisecond: -1 }))
      .toThrow(RangeError);
    expect(() => trueSolarDateTime({ ...fields, millisecond: 1000 }))
      .toThrow(RangeError);
    expect(() => trueSolarDateTime({ ...fields, millisecond: 0.5 }))
      .toThrow(RangeError);
  });

  it("加秒拒绝会被整秒值对象静默截断的小数", () => {
    const value = beijingDateTime({
      year: 2024, month: 1, day: 1, hour: 0, minute: 0, second: 0,
    });
    expect(() => addSeconds(value, 0.5)).toThrow(RangeError);
  });
});

describe("寿星太阳 facade", () => {
  it("十二个 Jie 使用强类型名称并在出口四舍五入至整秒", () => {
    expect(jieMoment(2024, "立春")).toMatchObject({
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 7,
    });
    expect(jieMoment(2025, "小寒")).toMatchObject({
      year: 2025, month: 1, day: 5, hour: 10, minute: 32, second: 47,
    });
  });

  it("未提供出生地时复制钟表时字段并补零毫秒", () => {
    const clockTime = beijingDateTime({
      year: 1997, month: 11, day: 19, hour: 9, minute: 0, second: 0,
    });
    expect(toTrueSolarDateTime(clockTime, undefined)).toEqual({
      year: 1997,
      month: 11,
      day: 19,
      hour: 9,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  });

  it("经度修正与高精度均时差合成后只在最终取整至毫秒一次", () => {
    const clockTime = beijingDateTime({
      year: 1997, month: 11, day: 19, hour: 9, minute: 0, second: 0,
    });
    expect(toTrueSolarDateTime(clockTime, 104.0668)).toEqual({
      year: 1997,
      month: 11,
      day: 19,
      hour: 8,
      minute: 10,
      second: 58,
      millisecond: 27,
    });
  });

  it("强类型 Jie seam 使用事件自身均时差并返回毫秒级真太阳时", () => {
    expect(trueSolarJieMoment(2024, "立春")).toEqual({
      year: 2024,
      month: 2,
      day: 4,
      hour: 16,
      minute: 27,
      second: 6,
      millisecond: 834,
    });
    expect(trueSolarJieMoment(2024, "立春", 104.0668)).toEqual({
      year: 2024,
      month: 2,
      day: 4,
      hour: 15,
      minute: 9,
      second: 34,
      millisecond: 253,
    });
  });
});
