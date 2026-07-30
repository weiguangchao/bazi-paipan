import { describe, it, expect } from "vitest";
import { paipan } from "@/domain/paipan/paipan";

describe("排盘 - 日柱 (T1)", () => {
  // 真值来源：Deep Oracle 排盘，2000-01-01 钟表时 → 日柱 戊午
  // https://www.deeporacle.ai/zh-TW/bazi/chart/2000/1/1
  it("既有命例：2000-01-01 12:00 钟表时 → 日柱 戊午", () => {
    const result = paipan({
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
    });
    expect(result.rizhu).toBe("戊午");
  });

  // ADR-0002：日界线在子正（00:00）
  // 23:59 仍是当日日柱，次日 00:00 切为新日柱
  it("子正跨日：2000-01-01 23:59 → 戊午；2000-01-02 00:00 → 己未", () => {
    const late = paipan({ year: 2000, month: 1, day: 1, hour: 23, minute: 59 });
    const early = paipan({ year: 2000, month: 1, day: 2, hour: 0, minute: 0 });
    expect(late.rizhu).toBe("戊午"); // 23:59 仍属 1 日
    expect(early.rizhu).toBe("己未"); // 00:00 已属 2 日
  });

  // 真值来源：Deep Oracle，2000-01-02 → 日柱 己未
  // https://www.deeporacle.ai/bazi/chart/2000/1/2
  it("既有命例：2000-01-02 12:00 钟表时 → 日柱 己未", () => {
    const result = paipan({
      year: 2000,
      month: 1,
      day: 2,
      hour: 12,
      minute: 0,
    });
    expect(result.rizhu).toBe("己未");
  });
});

describe("排盘 - 年柱 (T2)", () => {
  // ADR-0001：年柱在交立春那一刻切换。
  // 立春 2000 = 北京时间 2000-02-04 20:40:24。
  // 真值来源：固定寿星天文历原始 JS reference runner。
  // 立春前 -> 己卯（上一干支年）；立春后 -> 庚辰（新干支年）。

  it("立春前出生 -> 上一干支年：2000-02-04 12:00 钟表时 -> 年柱 己卯", () => {
    const result = paipan({
      year: 2000,
      month: 2,
      day: 4,
      hour: 12,
      minute: 0,
    });
    expect(result.nianzhu).toBe("己卯");
  });

  it("立春后出生 -> 新干支年：2000-02-06 12:00 钟表时 -> 年柱 庚辰", () => {
    const result = paipan({
      year: 2000,
      month: 2,
      day: 6,
      hour: 12,
      minute: 0,
    });
    expect(result.nianzhu).toBe("庚辰");
  });

  it("毫秒交节所在秒之前属旧年柱，下一秒属新年柱", () => {
    const before = paipan({
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 6,
    });
    const after = paipan({
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 7,
    });
    expect(before.nianzhu).toBe("癸卯");
    expect(after.nianzhu).toBe("甲辰");
  });
});

describe("排盘 - 月柱 (T3)", () => {
  // ADR-0001：月柱在交每月之"节"（立春、惊蛰、清明……）那一刻切换。
  // 月干由年干 + 月地支经五虎遁推出；立春前出生归上一干支年，月干用该年干推算。
  // 真值来源：ADR-0006 固定寿星提交给出的交节时刻 + ADR-0007 毫秒出口 + 五虎遁口诀。
  // 2000 年交节时刻（北京时间）：小寒 01-06 09:00:42、立春 02-04 20:40:24、
  // 惊蛰 03-05 14:42:40。
  // 五虎遁：1999 己卯年（甲己丙作首）寅月丙寅→子月丙子、丑月丁丑；
  //         2000 庚辰年（乙庚戊为头）寅月戊寅、卯月己卯。

  it("小寒前出生 -> 子月（1999己年五虎遁）", () => {
    const result = paipan({ year: 2000, month: 1, day: 6, hour: 9, minute: 0, second: 41 });
    expect(result.yuezhu).toBe("丙子");
  });

  it("小寒所在秒起点仍属子月，下一秒进入丑月", () => {
    const before = paipan({
      year: 2000, month: 1, day: 6, hour: 9, minute: 0, second: 42,
    });
    const after = paipan({
      year: 2000, month: 1, day: 6, hour: 9, minute: 0, second: 43,
    });
    expect(before.yuezhu).toBe("丙子");
    expect(after.yuezhu).toBe("丁丑");
  });

  it("立春前出生 -> 丑月（仍属上一干支年，己年五虎遁）", () => {
    const result = paipan({ year: 2000, month: 2, day: 4, hour: 20, minute: 40, second: 23 });
    expect(result.nianzhu).toBe("己卯");
    expect(result.yuezhu).toBe("丁丑");
  });

  it("立春所在秒起点仍属旧柱，下一秒进入庚辰年戊寅月", () => {
    const before = paipan({
      year: 2000, month: 2, day: 4, hour: 20, minute: 40, second: 24,
    });
    const after = paipan({
      year: 2000, month: 2, day: 4, hour: 20, minute: 40, second: 25,
    });
    expect([before.nianzhu, before.yuezhu]).toEqual(["己卯", "丁丑"]);
    expect([after.nianzhu, after.yuezhu]).toEqual(["庚辰", "戊寅"]);
  });

  it("惊蛰前一秒出生 -> 寅月", () => {
    const result = paipan({ year: 2000, month: 3, day: 5, hour: 14, minute: 42, second: 39 });
    expect(result.yuezhu).toBe("戊寅");
  });

  it("惊蛰后一秒出生 -> 卯月（己卯）", () => {
    const result = paipan({ year: 2000, month: 3, day: 5, hour: 14, minute: 42, second: 41 });
    expect(result.yuezhu).toBe("己卯");
  });

  // 同月跨节验证：2000-03-10 卯月（Deep Oracle 确认月柱己卯）
  it("既有命例：2000-03-10 12:00 -> 月柱 己卯", () => {
    const result = paipan({ year: 2000, month: 3, day: 10, hour: 12, minute: 0 });
    expect(result.yuezhu).toBe("己卯");
  });
});

describe("排盘 - 时柱 (T4)", () => {
  // 五鼠遁（起时诀）：甲己还加甲、乙庚丙作初、丙辛从戊起、丁壬庚子居、戊癸壬子真。
  // 时柱地支按时辰取（子 23-1、丑 1-3……），天干由日干经五鼠遁推出。
  // 子时依earlylate子时（ADR-0002）：late子时 23:00-00:00 日柱属当日、用当日子时干支；
  //   early子时 00:00-01:00 日柱属次日（历法当日）、用该日子时干支。
  // 日柱真值：2000-01-01 戊午（日干戊）、2000-01-02 己未（日干己），见 T1 测试。

  it("late子时：2000-01-01 23:30 -> 日柱 戊午、时柱 壬子（戊日壬子起）", () => {
    const result = paipan({ year: 2000, month: 1, day: 1, hour: 23, minute: 30 });
    expect(result.rizhu).toBe("戊午");
    expect(result.shizhu).toBe("壬子");
  });

  it("early子时：2000-01-02 00:30 -> 日柱 己未、时柱 甲子（己日甲子起）", () => {
    const result = paipan({ year: 2000, month: 1, day: 2, hour: 0, minute: 30 });
    expect(result.rizhu).toBe("己未");
    expect(result.shizhu).toBe("甲子");
  });

  it("午时：2000-01-01 12:00 -> 时柱 戊午（壬子起顺推至午时为戊）", () => {
    const result = paipan({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    expect(result.shizhu).toBe("戊午");
  });

  it("卯时：2000-01-01 06:00 -> 时柱 乙卯", () => {
    const result = paipan({ year: 2000, month: 1, day: 1, hour: 6, minute: 0 });
    expect(result.shizhu).toBe("乙卯");
  });

  it("完整四柱：2000-01-01 12:00 -> 年柱 己卯、月柱 丙子、日柱 戊午、时柱 戊午", () => {
    const result = paipan({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    expect(result.nianzhu).toBe("己卯");
    expect(result.yuezhu).toBe("丙子");
    expect(result.rizhu).toBe("戊午");
    expect(result.shizhu).toBe("戊午");
  });

  // 锚点前日期：1990-01-01 距锚点 2000-01-01 为 3652 天（offset=-3652，负值），
  // 验证日柱/时柱天干在负 offset 下仍正确归一化。
  // dayIndex = ((54-3652) mod 60 + 60) mod 60 = 2 -> 丙寅；日干丙 -> 五鼠遁戊子起，
  // 午时顺推至甲午。
  it("锚点前日期：1990-01-01 12:00 -> 日柱 丙寅、时柱 甲午", () => {
    const result = paipan({ year: 1990, month: 1, day: 1, hour: 12, minute: 0 });
    expect(result.rizhu).toBe("丙寅");
    expect(result.shizhu).toBe("甲午");
  });
});

describe("排盘 - 子正跨界提示 (T4)", () => {
  // 近子正：出生时刻距最近子正（00:00）≤ 15 分钟时判定为近子正，CLI 据此打印跨界提示。
  it("近子正（前夜 23:50，距 10 分钟）-> 近子正 true", () => {
    const result = paipan({ year: 2000, month: 1, day: 1, hour: 23, minute: 50 });
    expect(result.nearZizheng).toBe(true);
  });

  it("近子正（当日 00:10，距 10 分钟）-> 近子正 true", () => {
    const result = paipan({ year: 2000, month: 1, day: 2, hour: 0, minute: 10 });
    expect(result.nearZizheng).toBe(true);
  });

  it("非近子正（23:30，距子正 30 分钟）-> 近子正 false", () => {
    const result = paipan({ year: 2000, month: 1, day: 1, hour: 23, minute: 30 });
    expect(result.nearZizheng).toBe(false);
  });

  it("非近子正（00:30，距子正 30 分钟）-> 近子正 false", () => {
    const result = paipan({ year: 2000, month: 1, day: 2, hour: 0, minute: 30 });
    expect(result.nearZizheng).toBe(false);
  });

  it("非近子正（12:00，远离子正）-> 近子正 false", () => {
    const result = paipan({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    expect(result.nearZizheng).toBe(false);
  });
});

describe("排盘 - 真太阳时合成（经度修正 + 均时差）(T5/#15)", () => {
  // ADR-0007：四柱、早晚子时和近子正使用同一个出生真太阳时；起运由后续 ticket 迁移。
  // 真太阳时 = 钟表时 + 经度修正 + 均时差（CONTEXT.md）。
  // 喀什地区 ~75.99°E，经度修正 ≈ −176 分；双鸭山市 ~131.17°E，经度修正 ≈ +44.6 分。

  it("排盘结果不暴露经度修正实现状态", () => {
    const result = paipan({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    expect(result).not.toHaveProperty("longitudeCorrectionApplied");
  });

  it("无出生地与成都均以各自真太阳时立春切换年柱和月柱", () => {
    const beforeClock = paipan({
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 6,
    });
    const afterClock = paipan({
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 7,
    });
    const beforeChengdu = paipan({
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 6,
      birthplace: { province: "四川省", city: "成都市" },
    });
    const afterChengdu = paipan({
      year: 2024, month: 2, day: 4, hour: 16, minute: 27, second: 7,
      birthplace: { province: "四川省", city: "成都市" },
    });

    expect([beforeClock.nianzhu, beforeClock.yuezhu]).toEqual(["癸卯", "乙丑"]);
    expect([afterClock.nianzhu, afterClock.yuezhu]).toEqual(["甲辰", "丙寅"]);
    expect([beforeChengdu.nianzhu, beforeChengdu.yuezhu])
      .toEqual(["癸卯", "乙丑"]);
    expect([afterChengdu.nianzhu, afterChengdu.yuezhu])
      .toEqual(["甲辰", "丙寅"]);
  });

  // 同一钟表时刻给/不给地名 -> 时柱不同。
  // 2000-01-01 12:00 钟表时：日柱 戊午、午时 -> 时柱 戊午（见 T4 既有命例）。
  // 经喀什经度修正（≈ −176 分）+ 均时差（≈ −3.8 分）后真太阳时 ≈ 09:00，
  // 落入巳时；日柱不变（仍 1 日戊午），时柱由戊日五鼠遁（壬子起）顺推至巳 -> 丁巳。
  it("给/不给喀什地名 -> 时柱不同：钟表 12:00 戊午 vs 真太阳时 丁巳", () => {
    const clock = paipan({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    const trueSolarTime = paipan({
      year: 2000, month: 1, day: 1, hour: 12, minute: 0,
      birthplace: { province: "新疆维吾尔自治区", city: "喀什地区" },
    });
    expect(clock.shizhu).toBe("戊午");
    expect(trueSolarTime.shizhu).toBe("丁巳");
    expect(clock.shizhu).not.toBe(trueSolarTime.shizhu);
    // 经度修正不影响日柱（真太阳时仍属同一历法日）
    expect(trueSolarTime.rizhu).toBe("戊午");
  });

  // 跨子正用例：真太阳时合成使真太阳时跨越子正（00:00），日柱与时柱同时变化。
  // 2000-01-01 23:20 钟表时（晚子时）：日柱 戊午、时柱 壬子（戊日壬子起）。
  // 双鸭山经度修正 +44.6 分 + 均时差 −4.0 分 -> 真太阳时 2000-01-02 00:00（早子时）：
  // 日柱 己未、时柱 甲子（己日甲子起）；近子正由 false 变 true。
  it("双鸭山经度修正跨子正 -> 日柱/时柱/近子正同时变化", () => {
    const clock = paipan({ year: 2000, month: 1, day: 1, hour: 23, minute: 20 });
    const trueSolarTime = paipan({
      year: 2000, month: 1, day: 1, hour: 23, minute: 20,
      birthplace: { province: "黑龙江省", city: "双鸭山市" },
    });
    expect(clock.rizhu).toBe("戊午");
    expect(clock.shizhu).toBe("壬子");
    expect(clock.nearZizheng).toBe(false);

    expect(trueSolarTime.rizhu).toBe("己未");
    expect(trueSolarTime.shizhu).toBe("甲子");
    expect(trueSolarTime.nearZizheng).toBe(true);
  });

  it.each([
    {
      label: "跨年",
      input: { year: 2024, month: 1, day: 1, hour: 0, minute: 30 },
      clock: ["癸卯", "甲子", "甲子", "甲子"],
      kashgar: ["癸卯", "甲子", "癸亥", "癸亥"],
    },
    {
      label: "跨月",
      input: { year: 2024, month: 3, day: 1, hour: 0, minute: 30 },
      clock: ["甲辰", "丙寅", "甲子", "甲子"],
      kashgar: ["甲辰", "丙寅", "癸亥", "癸亥"],
    },
  ])("喀什真太阳时跨$label时四柱共用换算后的日期与时辰", ({
    input,
    clock: expectedClock,
    kashgar: expectedKashgar,
  }) => {
    const clock = paipan(input);
    const kashgar = paipan({
      ...input,
      birthplace: { province: "新疆维吾尔自治区", city: "喀什地区" },
    });
    const pillars = (result: ReturnType<typeof paipan>) => [
      result.nianzhu, result.yuezhu, result.rizhu, result.shizhu,
    ];

    expect(pillars(clock)).toEqual(expectedClock);
    expect(pillars(kashgar)).toEqual(expectedKashgar);
  });

  // 中央经线附近（北京 ~116.41°E）经度修正 + 均时差合计约 −18 分（2000-01-01），
  // 通常不跨时辰界，时柱不变；但仍标记为做了经度修正。
  it("北京出生：经度修正 + 均时差幅度小时，时柱不变", () => {
    const clock = paipan({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    const trueSolarTime = paipan({
      year: 2000, month: 1, day: 1, hour: 12, minute: 0,
      birthplace: { province: "北京市", city: "市辖区" },
    });
    expect(trueSolarTime.shizhu).toBe(clock.shizhu);
  });

  // 均时差使近子正真太阳时跨子正、日柱/时柱同时切换。
  // 2026-11-03 23:48 钟表时（晚子时）：均时差 ≈ +16.3 分（11 月初极大值）。
  // 常州市 ~119.98°E（近中央经线，经度修正 ≈ 0）-> 总偏移 ≈ +16.3 分，
  // 真太阳时 ≈ 次日 00:04（早子时），日柱、时柱同时切换：
  //   钟表时：日柱 辛巳、时柱 戊子（辛日戊子起）
  //   trueSolarTime：日柱 壬午、时柱 庚子（壬日庚子起）
  // 验证寿星均时差作用于排盘（经度修正 ≈ 0 时由均时差主导）。
  it("均时差使近子正真太阳时跨子正 -> 日柱/时柱同时切换（常州 11 月初）", () => {
    const clock = paipan({ year: 2026, month: 11, day: 3, hour: 23, minute: 48 });
    const trueSolarTime = paipan({
      year: 2026, month: 11, day: 3, hour: 23, minute: 48,
      birthplace: { province: "江苏省", city: "常州市" },
    });
    expect(clock.rizhu).toBe("辛巳");
    expect(clock.shizhu).toBe("戊子");
    // 均时差把真太阳时推过子正 -> 日柱、时柱同时切换
    expect(trueSolarTime.rizhu).toBe("壬午");
    expect(trueSolarTime.shizhu).toBe("庚子");
    // 两侧均近子正（钟表时 23:48 距子正 12 分、真太阳时刚过子正）
    expect(clock.nearZizheng).toBe(true);
    expect(trueSolarTime.nearZizheng).toBe(true);
  });

  it("给出未知省/市 -> 抛 RangeError（输入非法，CLI 应提示）", () => {
    expect(() =>
      paipan({
        year: 2000, month: 1, day: 1, hour: 12, minute: 0,
        birthplace: { province: "火星省", city: "某市" },
      }),
    ).toThrow(RangeError);
  });
});
