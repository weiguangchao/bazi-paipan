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

describe("排盘 - 年柱 (T2)", () => {
  // ADR-0001：年柱在交立春那一刻切换。
  // 立春 2000 = 北京时间 2000-02-05 04:40（UTC 2000-02-04 20:40），
  // 真值来源：移植自 tyme4ts 的 jieqi.ts（与官方库一致）+ Deep Oracle 确认 2000 年柱 庚辰、1999 年柱 己卯。
  // 立春前 -> 己卯（上一干支年）；立春后 -> 庚辰（新干支年）。

  it("立春前出生 -> 上一干支年：2000-02-04 12:00 钟表时 -> 年柱 己卯", () => {
    const result = 排盘({
      year: 2000,
      month: 2,
      day: 4,
      hour: 12,
      minute: 0,
    });
    expect(result.年柱).toBe("己卯");
  });

  it("立春后出生 -> 新干支年：2000-02-06 12:00 钟表时 -> 年柱 庚辰", () => {
    const result = 排盘({
      year: 2000,
      month: 2,
      day: 6,
      hour: 12,
      minute: 0,
    });
    expect(result.年柱).toBe("庚辰");
  });

  // 跨立春边界：同一公历日 2000-02-05，立春落在 04:40
  it("跨立春边界：2000-02-05 03:00 -> 己卯；2000-02-05 06:00 -> 庚辰", () => {
    const 前 = 排盘({ year: 2000, month: 2, day: 5, hour: 3, minute: 0 });
    const 后 = 排盘({ year: 2000, month: 2, day: 5, hour: 6, minute: 0 });
    expect(前.年柱).toBe("己卯");
    expect(后.年柱).toBe("庚辰");
  });
});

describe("排盘 - 月柱 (T3)", () => {
  // ADR-0001：月柱在交每月之"节"（立春、惊蛰、清明……）那一刻切换。
  // 月干由年干 + 月地支经五虎遁推出；立春前出生归上一干支年，月干用该年干推算。
  // 真值来源：移植自 tyme4ts 的 jieqi.ts 给出的交节时刻 + 五虎遁口诀 +
  //   Deep Oracle 确认（2000 庚辰年、寅月戊寅、卯月己卯）。
  // 2000 年交节时刻（北京时间）：小寒 01-06 17:00、立春 02-05 04:40、惊蛰 03-05 22:42。
  // 五虎遁：1999 己卯年（甲己丙作首）寅月丙寅→子月丙子、丑月丁丑；
  //         2000 庚辰年（乙庚戊为头）寅月戊寅、卯月己卯。

  it("小寒前出生 -> 子月（1999己年五虎遁）：2000-01-06 16:59 -> 月柱 丙子", () => {
    const result = 排盘({ year: 2000, month: 1, day: 6, hour: 16, minute: 59 });
    expect(result.月柱).toBe("丙子");
  });

  it("小寒后出生 -> 丑月（丁丑）：2000-01-06 17:01 -> 月柱 丁丑", () => {
    const result = 排盘({ year: 2000, month: 1, day: 6, hour: 17, minute: 1 });
    expect(result.月柱).toBe("丁丑");
  });

  it("立春前出生 -> 丑月（仍属上一干支年，己年五虎遁）：2000-02-05 04:39 -> 月柱 丁丑", () => {
    const result = 排盘({ year: 2000, month: 2, day: 5, hour: 4, minute: 39 });
    expect(result.年柱).toBe("己卯");
    expect(result.月柱).toBe("丁丑");
  });

  it("立春后出生 -> 寅月（庚年五虎遁戊寅）：2000-02-05 04:41 -> 月柱 戊寅", () => {
    const result = 排盘({ year: 2000, month: 2, day: 5, hour: 4, minute: 41 });
    expect(result.年柱).toBe("庚辰");
    expect(result.月柱).toBe("戊寅");
  });

  it("惊蛰前出生 -> 寅月：2000-03-05 22:41 -> 月柱 戊寅", () => {
    const result = 排盘({ year: 2000, month: 3, day: 5, hour: 22, minute: 41 });
    expect(result.月柱).toBe("戊寅");
  });

  it("惊蛰后出生 -> 卯月（己卯）：2000-03-05 22:43 -> 月柱 己卯", () => {
    const result = 排盘({ year: 2000, month: 3, day: 5, hour: 22, minute: 43 });
    expect(result.月柱).toBe("己卯");
  });

  // 同月跨节验证：2000-03-10 卯月（Deep Oracle 确认月柱己卯）
  it("已知命例：2000-03-10 12:00 -> 月柱 己卯", () => {
    const result = 排盘({ year: 2000, month: 3, day: 10, hour: 12, minute: 0 });
    expect(result.月柱).toBe("己卯");
  });
});

describe("排盘 - 时柱 (T4)", () => {
  // 五鼠遁（起时诀）：甲己还加甲、乙庚丙作初、丙辛从戊起、丁壬庚子居、戊癸壬子真。
  // 时柱地支按时辰取（子 23-1、丑 1-3……），天干由日干经五鼠遁推出。
  // 子时依早晚子时（ADR-0002）：晚子时 23:00-00:00 日柱属当日、用当日子时干支；
  //   早子时 00:00-01:00 日柱属次日（历法当日）、用该日子时干支。
  // 日柱真值：2000-01-01 戊午（日干戊）、2000-01-02 己未（日干己），见 T1 测试。

  it("晚子时：2000-01-01 23:30 -> 日柱 戊午、时柱 壬子（戊日壬子起）", () => {
    const result = 排盘({ year: 2000, month: 1, day: 1, hour: 23, minute: 30 });
    expect(result.日柱).toBe("戊午");
    expect(result.时柱).toBe("壬子");
  });

  it("早子时：2000-01-02 00:30 -> 日柱 己未、时柱 甲子（己日甲子起）", () => {
    const result = 排盘({ year: 2000, month: 1, day: 2, hour: 0, minute: 30 });
    expect(result.日柱).toBe("己未");
    expect(result.时柱).toBe("甲子");
  });

  it("午时：2000-01-01 12:00 -> 时柱 戊午（壬子起顺推至午时为戊）", () => {
    const result = 排盘({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    expect(result.时柱).toBe("戊午");
  });

  it("卯时：2000-01-01 06:00 -> 时柱 乙卯", () => {
    const result = 排盘({ year: 2000, month: 1, day: 1, hour: 6, minute: 0 });
    expect(result.时柱).toBe("乙卯");
  });

  it("完整四柱：2000-01-01 12:00 -> 年柱 己卯、月柱 丙子、日柱 戊午、时柱 戊午", () => {
    const result = 排盘({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    expect(result.年柱).toBe("己卯");
    expect(result.月柱).toBe("丙子");
    expect(result.日柱).toBe("戊午");
    expect(result.时柱).toBe("戊午");
  });

  // 锚点前日期：1990-01-01 距锚点 2000-01-01 为 3652 天（offset=-3652，负值），
  // 验证日柱/时柱天干在负 offset 下仍正确归一化。
  // dayIndex = ((54-3652) mod 60 + 60) mod 60 = 2 -> 丙寅；日干丙 -> 五鼠遁戊子起，
  // 午时顺推至甲午。
  it("锚点前日期：1990-01-01 12:00 -> 日柱 丙寅、时柱 甲午", () => {
    const result = 排盘({ year: 1990, month: 1, day: 1, hour: 12, minute: 0 });
    expect(result.日柱).toBe("丙寅");
    expect(result.时柱).toBe("甲午");
  });
});

describe("排盘 - 子正跨界提示 (T4)", () => {
  // 近子正：出生时刻距最近子正（00:00）≤ 15 分钟时判定为近子正，CLI 据此打印跨界提示。
  it("近子正（前夜 23:50，距 10 分钟）-> 近子正 true", () => {
    const result = 排盘({ year: 2000, month: 1, day: 1, hour: 23, minute: 50 });
    expect(result.近子正).toBe(true);
  });

  it("近子正（当日 00:10，距 10 分钟）-> 近子正 true", () => {
    const result = 排盘({ year: 2000, month: 1, day: 2, hour: 0, minute: 10 });
    expect(result.近子正).toBe(true);
  });

  it("非近子正（23:30，距子正 30 分钟）-> 近子正 false", () => {
    const result = 排盘({ year: 2000, month: 1, day: 1, hour: 23, minute: 30 });
    expect(result.近子正).toBe(false);
  });

  it("非近子正（00:30，距子正 30 分钟）-> 近子正 false", () => {
    const result = 排盘({ year: 2000, month: 1, day: 2, hour: 0, minute: 30 });
    expect(result.近子正).toBe(false);
  });

  it("非近子正（12:00，远离子正）-> 近子正 false", () => {
    const result = 排盘({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    expect(result.近子正).toBe(false);
  });
});
