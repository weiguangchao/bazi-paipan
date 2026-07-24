import { describe, it, expect, vi, afterEach } from "vitest";
import { liunian } from "@/domain/paipan/liunian";
import { getBeijingYearMonth } from "@/utils/beijing-time";

// 流年纯函数（ADR-0003）：给定起始公历年，返回从该年起向后 10 柱干支。
// 每柱 = 六十甲子((公历年 - 4) mod 60)，公历年每 +1，序号 +1。
// 不查立春，纯按公历年 mod 60。
// 2000 庚辰：序号 (2000-4) mod 60 = 1996 mod 60 = 16 -> 六十甲子(16) = 庚辰（甲子=0）。
// 2024 甲辰：(2024-4) mod 60 = 2020 mod 60 = 40 -> 六十甲子(40) = 甲辰。

describe("流年 - 纯函数定点 (T9)", () => {
  it("流年(2024) -> 从甲辰起 10 柱", () => {
    const zhu = liunian(2024);
    expect(zhu).toHaveLength(10);
    expect(zhu[0]).toEqual({ year: 2024, ganzhi: "甲辰" });
    expect(zhu).toEqual([
      { year: 2024, ganzhi: "甲辰" },
      { year: 2025, ganzhi: "乙巳" },
      { year: 2026, ganzhi: "丙午" },
      { year: 2027, ganzhi: "丁未" },
      { year: 2028, ganzhi: "戊申" },
      { year: 2029, ganzhi: "己酉" },
      { year: 2030, ganzhi: "庚戌" },
      { year: 2031, ganzhi: "辛亥" },
      { year: 2032, ganzhi: "壬子" },
      { year: 2033, ganzhi: "癸丑" },
    ]);
  });

  it("流年(2000) -> 从庚辰起 10 柱", () => {
    const zhu = liunian(2000);
    expect(zhu[0]).toEqual({ year: 2000, ganzhi: "庚辰" });
    expect(zhu[9]).toEqual({ year: 2009, ganzhi: "己丑" });
  });

  // 跨甲子边界：第 60 个组合回到甲子。起点取一个让序列横跨边界的年份。
  // 1984 甲子年：(1984-4) mod 60 = 0 -> 甲子。第 60 个组合是甲子，第 1 柱就是甲子。
  // 取 1983 癸亥年（序号 59）作起点 -> 第 2 柱跨回甲子（序号 0）。
  it("跨甲子边界：流年(1983) 癸亥起，第 2 柱回到甲子", () => {
    const zhu = liunian(1983);
    expect(zhu[0]).toEqual({ year: 1983, ganzhi: "癸亥" });
    expect(zhu[1]).toEqual({ year: 1984, ganzhi: "甲子" });
    expect(zhu[2]).toEqual({ year: 1985, ganzhi: "乙丑" });
  });

  // 公历年 mod 60 归一化：负年（公元前）也不应崩。只需确保 mod 60 归一化正确。
  // 取一个 mod 后落在已知序号的年份：年份 + 60 应得同一柱。
  it("公历年 mod 60 归一化：流年(Y) 与 流年(Y+60) 首柱干支相同", () => {
    const a = liunian(2024)[0]!;
    const b = liunian(2084)[0]!;
    expect(a.ganzhi).toBe(b.ganzhi);
    expect(b.year).toBe(2084);
  });

  it("流年(1) -> 序号 (1-4) mod 60 归一化为 57 -> 辛酉", () => {
    // (1 - 4) = -3，归一化 ((-3 % 60) + 60) % 60 = 57 -> 天干 57%10=7 辛，地支 57%12=9 酉
    const zhu = liunian(1);
    expect(zhu[0]).toEqual({ year: 1, ganzhi: "辛酉" });
  });
});

// getBeijingYearMonth：Web API 边缘按北京时间（UTC+8）读机器时钟算"今年"。
// 跨时区/跨年仍按中国历法判断今年（ADR-0003）--用例注入固定时钟避免跨年时间炸弹。
describe("getBeijingYearMonth - 北京时间跨年 (T9)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // UTC 2024-12-31 16:00 = 北京时间 2025-01-01 00:00 -> 按中国历法已进 2025 年。
  it("UTC 2024-12-31 16:00（北京 2025-01-01 00:00）-> 归 2025", () => {
    vi.setSystemTime(new Date(Date.UTC(2024, 11, 31, 16, 0)));
    expect(getBeijingYearMonth().year).toBe(2025);
  });

  // UTC 2024-12-31 15:59 = 北京时间 2024-12-31 23:59 -> 仍属 2024 年。
  it("UTC 2024-12-31 15:59（北京 2024-12-31 23:59）-> 归 2024", () => {
    vi.setSystemTime(new Date(Date.UTC(2024, 11, 31, 15, 59)));
    expect(getBeijingYearMonth().year).toBe(2024);
  });

  // UTC 2024-01-01 00:00 = 北京时间 2024-01-01 08:00 -> 2024。
  it("UTC 2024-01-01 00:00（北京 2024-01-01 08:00）-> 归 2024", () => {
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 1, 0, 0)));
    expect(getBeijingYearMonth().year).toBe(2024);
  });
});
