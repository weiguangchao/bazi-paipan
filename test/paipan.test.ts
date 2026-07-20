import { describe, it, expect } from "vitest";
import { 排盘 } from "../src/paipan.js";

describe("排盘 - 日柱 (T1)", () => {
  // 真值来源：Deep Oracle 排盘，2000-01-01 钟表时 → 日柱 戊午
  // https://www.deeporacle.ai/zh-TW/bazi/chart/2000/1/1
  it("已知命例：2000-01-01 12:00 钟表时 → 日柱 戊午", () => {
    const result = 排盘({
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
    });
    expect(result.日柱).toBe("戊午");
  });

  // ADR-0002：日界线在子正（00:00）
  // 23:59 仍是当日日柱，次日 00:00 切为新日柱
  it("子正跨日：2000-01-01 23:59 → 戊午；2000-01-02 00:00 → 己未", () => {
    const 晚 = 排盘({ year: 2000, month: 1, day: 1, hour: 23, minute: 59 });
    const 早 = 排盘({ year: 2000, month: 1, day: 2, hour: 0, minute: 0 });
    expect(晚.日柱).toBe("戊午"); // 23:59 仍属 1 日
    expect(早.日柱).toBe("己未"); // 00:00 已属 2 日
  });

  // 真值来源：Deep Oracle，2000-01-02 → 日柱 己未
  // https://www.deeporacle.ai/bazi/chart/2000/1/2
  it("已知命例：2000-01-02 12:00 钟表时 → 日柱 己未", () => {
    const result = 排盘({
      year: 2000,
      month: 1,
      day: 2,
      hour: 12,
      minute: 0,
    });
    expect(result.日柱).toBe("己未");
  });
});
