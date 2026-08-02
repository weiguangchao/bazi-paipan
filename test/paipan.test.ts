import { describe, expect, it } from "vitest";
import type { BirthProfile } from "@/domain/birth/birth-profile";
import type { Gender } from "@/domain/paipan/dayun";
import { mingpan } from "@/domain/paipan/mingpan";
import { beijingDateTime } from "@/domain/time/date-time";

const NOW = beijingDateTime({
  year: 2025, month: 1, day: 20, hour: 8, minute: 0, second: 0,
});

type BirthFields = Omit<BirthProfile, "gender"> & { gender?: Gender };

function chart(fields: BirthFields) {
  return mingpan({ ...fields, gender: fields.gender ?? "男" }, NOW);
}

function sizhuValues(result: ReturnType<typeof mingpan>) {
  return [
    result.sizhu.year.ganzhi,
    result.sizhu.month.ganzhi,
    result.sizhu.day.ganzhi,
    result.sizhu.hour.ganzhi,
  ];
}

describe("命盘 - 日柱", () => {
  it("既有命例：2000-01-01 12:00 钟表时 → 日柱 戊午", () => {
    expect(chart({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 })
      .sizhu.day.ganzhi).toBe("戊午");
  });

  it("子正跨日：2000-01-01 23:59 → 戊午；2000-01-02 00:00 → 己未", () => {
    const late = chart({ year: 2000, month: 1, day: 1, hour: 23, minute: 59 });
    const early = chart({ year: 2000, month: 1, day: 2, hour: 0, minute: 0 });
    expect(late.sizhu.day.ganzhi).toBe("戊午");
    expect(early.sizhu.day.ganzhi).toBe("己未");
  });

  it("既有命例：2000-01-02 12:00 钟表时 → 日柱 己未", () => {
    expect(chart({ year: 2000, month: 1, day: 2, hour: 12, minute: 0 })
      .sizhu.day.ganzhi).toBe("己未");
  });
});

describe("命盘 - 年柱与月柱 Jie 切换", () => {
  it("立春前后切换年柱", () => {
    const before = chart({ year: 2000, month: 2, day: 4, hour: 12, minute: 0 });
    const after = chart({ year: 2000, month: 2, day: 6, hour: 12, minute: 0 });
    expect(before.sizhu.year.ganzhi).toBe("己卯");
    expect(after.sizhu.year.ganzhi).toBe("庚辰");
  });

  it("公开分钟输入跨过 2024 立春时切换年柱与月柱", () => {
    const before = chart({ year: 2024, month: 2, day: 4, hour: 16, minute: 27 });
    const after = chart({ year: 2024, month: 2, day: 4, hour: 16, minute: 28 });
    expect(sizhuValues(before).slice(0, 2)).toEqual(["癸卯", "乙丑"]);
    expect(sizhuValues(after).slice(0, 2)).toEqual(["甲辰", "丙寅"]);
  });

  it("小寒前后从子月进入丑月", () => {
    const before = chart({ year: 2000, month: 1, day: 6, hour: 9, minute: 0 });
    const after = chart({ year: 2000, month: 1, day: 6, hour: 9, minute: 1 });
    expect(before.sizhu.month.ganzhi).toBe("丙子");
    expect(after.sizhu.month.ganzhi).toBe("丁丑");
  });

  it("2000 立春前后从己卯年丁丑月进入庚辰年戊寅月", () => {
    const before = chart({ year: 2000, month: 2, day: 4, hour: 20, minute: 40 });
    const after = chart({ year: 2000, month: 2, day: 4, hour: 20, minute: 41 });
    expect(sizhuValues(before).slice(0, 2)).toEqual(["己卯", "丁丑"]);
    expect(sizhuValues(after).slice(0, 2)).toEqual(["庚辰", "戊寅"]);
  });

  it("惊蛰前后从寅月进入卯月", () => {
    const before = chart({ year: 2000, month: 3, day: 5, hour: 14, minute: 42 });
    const after = chart({ year: 2000, month: 3, day: 5, hour: 14, minute: 43 });
    expect(before.sizhu.month.ganzhi).toBe("戊寅");
    expect(after.sizhu.month.ganzhi).toBe("己卯");
  });

  it("既有命例：2000-03-10 12:00 → 月柱 己卯", () => {
    expect(chart({ year: 2000, month: 3, day: 10, hour: 12, minute: 0 })
      .sizhu.month.ganzhi).toBe("己卯");
  });
});

describe("命盘 - 时柱与 zishi", () => {
  it("wanzishi 使用当日日干，zaozishi 使用次日日干", () => {
    const late = chart({ year: 2000, month: 1, day: 1, hour: 23, minute: 30 });
    const early = chart({ year: 2000, month: 1, day: 2, hour: 0, minute: 30 });
    expect(sizhuValues(late).slice(2)).toEqual(["戊午", "壬子"]);
    expect(sizhuValues(early).slice(2)).toEqual(["己未", "甲子"]);
  });

  it("午时与卯时按五鼠遁生成时柱", () => {
    expect(chart({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 })
      .sizhu.hour.ganzhi).toBe("戊午");
    expect(chart({ year: 2000, month: 1, day: 1, hour: 6, minute: 0 })
      .sizhu.hour.ganzhi).toBe("乙卯");
  });

  it("完整四柱：2000-01-01 12:00", () => {
    expect(sizhuValues(chart({
      year: 2000, month: 1, day: 1, hour: 12, minute: 0,
    }))).toEqual(["己卯", "丙子", "戊午", "戊午"]);
  });

  it("锚点前日期仍正确归一化日柱与时柱", () => {
    const result = chart({ year: 1990, month: 1, day: 1, hour: 12, minute: 0 });
    expect(sizhuValues(result).slice(2)).toEqual(["丙寅", "甲午"]);
  });
});

describe("命盘 - 真太阳时合成", () => {
  it("公开输出不暴露经度修正实现状态", () => {
    const result = chart({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    expect(result).not.toHaveProperty("longitudeCorrectionApplied");
  });

  it("无出生地与成都均以各自真太阳时立春切换年柱和月柱", () => {
    const fields = { year: 2024, month: 2, day: 4, hour: 16 };
    const beforeClock = chart({ ...fields, minute: 27 });
    const afterClock = chart({ ...fields, minute: 28 });
    const chengdu = { province: "四川省", city: "成都市" };
    const beforeChengdu = chart({ ...fields, minute: 27, birthplace: chengdu });
    const afterChengdu = chart({ ...fields, minute: 28, birthplace: chengdu });
    expect(sizhuValues(beforeClock).slice(0, 2)).toEqual(["癸卯", "乙丑"]);
    expect(sizhuValues(afterClock).slice(0, 2)).toEqual(["甲辰", "丙寅"]);
    expect(sizhuValues(beforeChengdu).slice(0, 2)).toEqual(["癸卯", "乙丑"]);
    expect(sizhuValues(afterChengdu).slice(0, 2)).toEqual(["甲辰", "丙寅"]);
  });

  it("喀什经度修正改变时柱但不改变日柱", () => {
    const fields = { year: 2000, month: 1, day: 1, hour: 12, minute: 0 };
    const clock = chart(fields);
    const kashgar = chart({
      ...fields,
      birthplace: { province: "新疆维吾尔自治区", city: "喀什地区" },
    });
    expect(sizhuValues(clock).slice(2)).toEqual(["戊午", "戊午"]);
    expect(sizhuValues(kashgar).slice(2)).toEqual(["戊午", "丁巳"]);
  });

  it("双鸭山真太阳时跨 zizheng 时日柱与时柱同时变化", () => {
    const fields = { year: 2000, month: 1, day: 1, hour: 23, minute: 20 };
    const clock = chart(fields);
    const shuangyashan = chart({
      ...fields,
      birthplace: { province: "黑龙江省", city: "双鸭山市" },
    });
    expect(sizhuValues(clock).slice(2)).toEqual(["戊午", "壬子"]);
    expect(sizhuValues(shuangyashan).slice(2)).toEqual(["己未", "甲子"]);
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
    input, clock: expectedClock, kashgar: expectedKashgar,
  }) => {
    const clock = chart(input);
    const kashgar = chart({
      ...input,
      birthplace: { province: "新疆维吾尔自治区", city: "喀什地区" },
    });
    expect(sizhuValues(clock)).toEqual(expectedClock);
    expect(sizhuValues(kashgar)).toEqual(expectedKashgar);
  });

  it("北京出生的真太阳时修正未跨时辰时保持时柱", () => {
    const fields = { year: 2000, month: 1, day: 1, hour: 12, minute: 0 };
    const clock = chart(fields);
    const beijing = chart({
      ...fields,
      birthplace: { province: "北京市", city: "市辖区" },
    });
    expect(beijing.sizhu.hour.ganzhi).toBe(clock.sizhu.hour.ganzhi);
  });

  it("均时差使常州真太阳时跨 zizheng 时日柱与时柱同时切换", () => {
    const fields = { year: 2026, month: 11, day: 3, hour: 23, minute: 48 };
    const clock = chart(fields);
    const changzhou = chart({
      ...fields,
      birthplace: { province: "江苏省", city: "常州市" },
    });
    expect(sizhuValues(clock).slice(2)).toEqual(["辛巳", "戊子"]);
    expect(sizhuValues(changzhou).slice(2)).toEqual(["壬午", "庚子"]);
  });

  it("结构上伪造未知出生地时抛出 invariant RangeError", () => {
    expect(() => chart({
      year: 2000, month: 1, day: 1, hour: 12, minute: 0,
      birthplace: { province: "火星省", city: "某市" },
    })).toThrow(RangeError);
  });
});
