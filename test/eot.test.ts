import { describe, it, expect } from "vitest";
import { equationOfTimeMinutes } from "@/domain/time/eot";

// 均时差纯函数：输入出生 UTC 时刻（毫秒时间戳），输出均时差分钟数
// （视太阳时 − 平太阳时，可为负、为分数）。按 UTC 日期计算，与经度无关。
// 词汇遵循 CONTEXT.md：均时差、平太阳时、真太阳时（视太阳时）。
//
// 锚点：均时差每年约 2 月中 ≈ −14 分、11 月初 ≈ +16 分；零点约 4 月中、6 月中、
// 9 月初、12 月底。采用 NOAA 简化式：EoT = 9.87·sin(2B) − 7.53·cos(B) − 1.5·sin(B)，
// B = 2π/365·(N − 81)，N 为自 1 月 1 日起的积日（分数）。

describe("均时差 - 极值锚点 (#14)", () => {
  // 2 月中极小值：约 −14 分。取 2 月 11 日 UTC 12:00（N ≈ 42）。
  it("2 月中（2-11）≈ −14 分", () => {
    const t = Date.UTC(2026, 1, 11, 12, 0);
    const e = equationOfTimeMinutes(t);
    expect(e).toBeLessThan(-13);
    expect(e).toBeGreaterThan(-16);
  });

  // 11 月初极大值：约 +16 分。取 11 月 3 日 UTC 12:00（N ≈ 307）。
  it("11 月初（11-03）≈ +16 分", () => {
    const t = Date.UTC(2026, 10, 3, 12, 0);
    const e = equationOfTimeMinutes(t);
    expect(e).toBeGreaterThan(15);
    expect(e).toBeLessThan(18);
  });
});

describe("均时差 - 零点锚点 (#14)", () => {
  // 零点：均时差 ≈ 0。取 4 月中、6 月中、9 月初、12 月底。
  it("4 月中（4-15）≈ 0 分", () => {
    const t = Date.UTC(2026, 3, 15, 12, 0);
    const e = equationOfTimeMinutes(t);
    expect(Math.abs(e)).toBeLessThan(2);
  });

  it("6 月中（6-13）≈ 0 分", () => {
    const t = Date.UTC(2026, 5, 13, 12, 0);
    const e = equationOfTimeMinutes(t);
    expect(Math.abs(e)).toBeLessThan(2);
  });

  it("9 月初（9-01）≈ 0 分", () => {
    const t = Date.UTC(2026, 8, 1, 12, 0);
    const e = equationOfTimeMinutes(t);
    expect(Math.abs(e)).toBeLessThan(2);
  });

  it("12 月底（12-25）≈ 0 分", () => {
    const t = Date.UTC(2026, 11, 25, 12, 0);
    const e = equationOfTimeMinutes(t);
    expect(Math.abs(e)).toBeLessThan(2);
  });
});

describe("均时差 - 随 UTC 日期变化、与经度无关 (#14)", () => {
  // 随 UTC 日期变化：不同日期均时差不同。2 月与 11 月符号相反、量级显著。
  it("2 月与 11 月均时差异号且量级显著", () => {
    const feb = equationOfTimeMinutes(Date.UTC(2026, 1, 11, 12, 0));
    const nov = equationOfTimeMinutes(Date.UTC(2026, 10, 3, 12, 0));
    expect(feb).toBeLessThan(0);
    expect(nov).toBeGreaterThan(0);
    expect(Math.abs(feb)).toBeGreaterThan(10);
    expect(Math.abs(nov)).toBeGreaterThan(10);
  });

  // 与经度无关（CONTEXT.md：均时差与经度无关）：该性质由函数签名结构保证——
  // 均时差分钟数 只接受 UTC 时刻，不取经度，故同一 UTC 时刻全球均时差相同。
  // 此用例验证其可运行时观测的一面：函数为纯函数，无隐藏状态/时钟/经度耦合，
  // 同一输入恒得同一输出。签名层面无经度参数本身即排除了经度依赖。
  it("同一 UTC 时刻恒得同一输出（纯函数，无经度耦合）", () => {
    const t = Date.UTC(2026, 0, 1, 0, 0);
    const e = equationOfTimeMinutes(t);
    expect(equationOfTimeMinutes(t)).toBe(e);
  });
});
