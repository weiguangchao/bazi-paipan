import { describe, expect, it } from "vitest";
import {
  addSeconds,
  beijingDateTime,
  compareDateTime,
  diffSeconds,
} from "@/domain/time/date-time";
import {
  jieMoment,
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

  it("TrueSolarDateTime 加秒后保留经度修正语义标志", () => {
    const clockTime = beijingDateTime({
      year: 2024, month: 12, day: 31, hour: 23, minute: 59, second: 59,
    });
    const trueSolarTime = toTrueSolarDateTime(clockTime, 120);
    const shifted = addSeconds(trueSolarTime, 1);
    expect(diffSeconds(shifted, trueSolarTime)).toBe(1);
    expect(shifted.longitudeCorrectionApplied).toBe(true);
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

  it("未提供出生地时复制钟表时字段且不应用经度修正", () => {
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
      longitudeCorrectionApplied: false,
    });
  });

  it("经度修正与高精度均时差合成后只在最终取整一次", () => {
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
      longitudeCorrectionApplied: true,
    });
  });
});
