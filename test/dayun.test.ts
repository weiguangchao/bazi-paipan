import { describe, it, expect } from "vitest";
import { paipan } from "@/domain/paipan/paipan";
import { dayun, determineDayunDirection, type Gender } from "@/domain/paipan/dayun";
import { beijingDateTime } from "@/domain/time/date-time";

// 大运命理规则（依共识与 CONTEXT.md）：
// - 方向：阳年（年干序号偶：甲丙戊庚壬）男 / 阴年女顺行；阴年男 / 阳年女逆行。
// - 起运岁：出生时刻到最近一"节"（顺行数下一节、逆行数上一节）的天数按
//   3 天折 1 年折算，精确到年+月（1 天 ≈ 4 个月），报为"N岁M月起运"。
// - 10 柱，每柱管 10 年，天干地支从月柱顺/逆推出。
//
// 真值来源：
// - 方向与干支序列由月柱顺/逆推进 + 五虎遁推出（与 tyme4ts 规则一致）。
// - 起运岁以 ADR-0006 固定寿星提交的北京时间 `Jie` facade 为准。
// 2000 庚辰年（庚=7，阳年）；2001 辛巳年（辛=7，阴年）。

describe("大运 - 方向 (T6)", () => {
  it("阳年男 -> 顺（2000 庚辰年 男，庚=6 阳年）", () => {
    expect(determineDayunDirection("男", 6)).toBe("顺"); // 庚=6
  });
  it("阳年女 -> 逆（2000 庚辰年 女，庚=6 阳年）", () => {
    expect(determineDayunDirection("女", 6)).toBe("逆");
  });
  it("阴年男 -> 逆（乙年男，乙=1 阴年）", () => {
    expect(determineDayunDirection("男", 1)).toBe("逆");
  });
  it("阴年女 -> 顺（1999 己卯年 女，己=5 阴年）", () => {
    expect(determineDayunDirection("女", 5)).toBe("顺");
  });
  it("甲年男 -> 顺（甲=0 阳年）", () => {
    expect(determineDayunDirection("男", 0)).toBe("顺");
  });
});

describe("排盘 - 大运顺行 10 柱", () => {
  // 2000-03-10 12:00 钟表时：庚辰年己卯月（阳年）男 -> 顺行。
  it("阳年男 2000-03-10 12:00 -> 顺行 10 柱庚辰…己丑，起运规则不变", () => {
    const result = paipan({ year: 2000, month: 3, day: 10, hour: 12, minute: 0, gender: "男" });
    expect(result.dayun).toBeDefined();
    const { direction, qiyun, zhu } = result.dayun!;
    expect(direction).toBe("顺");
    expect(qiyun).toEqual({ ageYears: 8, ageMonths: 5 });
    expect(zhu).toHaveLength(10);
    const ganzhi = zhu.map((p) => p.ganzhi);
    expect(ganzhi).toEqual([
      "庚辰", "辛巳", "壬午", "癸未",
      "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑",
    ]);
  });

  it("顺行 10 柱起运岁依次递增 10 岁", () => {
    const result = paipan({ year: 2000, month: 3, day: 10, hour: 12, minute: 0, gender: "男" });
    const qiyunsuiAges = result.dayun!.zhu.map((p) => p.qiyun.ageYears);
    expect(qiyunsuiAges).toEqual([8, 18, 28, 38, 48, 58, 68, 78, 88, 98]);
    // 月数从起运岁继承，各柱相同
    expect(result.dayun!.zhu.every((p) => p.qiyun.ageMonths === 5)).toBe(true);
  });

  // 起运年月：第 0 柱 = 出生年月 + 起运岁。出生 2000-03，起运 8岁6月 -> 2008-09。
  // 之后每柱 +10 年。顺序：2008-09、2018-09、2028-09、2038-09、2048-09、2058-09、2068-09、2078-09。
  it("顺行起运年月：2000-03 出生起运 8岁6月 -> 第 0 柱 2008-09", () => {
    const result = paipan({ year: 2000, month: 3, day: 10, hour: 12, minute: 0, gender: "男" });
    const firstZhu = result.dayun!.zhu[0]!;
    expect(firstZhu.startYearMonth).toEqual({ year: 2008, month: 8 });
    const lastZhu = result.dayun!.zhu[9]!;
    expect(lastZhu.startYearMonth).toEqual({ year: 2098, month: 8 });
  });
});

describe("排盘 - 大运逆行 10 柱", () => {
  // 同一阳年出生、改性别女 -> 逆行。月柱 己卯 逆推：戊寅、丁丑、丙子、乙亥、甲戌、癸酉、壬申、辛未。
  it("阳年女 2000-03-10 12:00 -> 逆行 10 柱戊寅…己巳，起运 1岁6月", () => {
    const result = paipan({ year: 2000, month: 3, day: 10, hour: 12, minute: 0, gender: "女" });
    const { direction, qiyun, zhu } = result.dayun!;
    expect(direction).toBe("逆");
    expect(qiyun).toEqual({ ageYears: 1, ageMonths: 7 });
    const ganzhi = zhu.map((p) => p.ganzhi);
    expect(ganzhi).toEqual([
      "戊寅", "丁丑", "丙子", "乙亥",
      "甲戌", "癸酉", "壬申", "辛未", "庚午", "己巳",
    ]);
  });

  // 阴年男 2001-03-10 12:00（辛巳年，辛=7 奇数序号 -> 阴年）-> 逆行。
  it("阴年男 2001-03-10 12:00 -> 逆行（阴年男逆）", () => {
    const result = paipan({ year: 2001, month: 3, day: 10, hour: 12, minute: 0, gender: "男" });
    expect(result.dayun!.direction).toBe("逆");
    // 月柱辛卯（辛年五虎遁丙起 -> 寅月庚寅、卯月辛卯）
    expect(result.yuezhu).toBe("辛卯");
    // 逆推 10 柱：庚寅、己丑、戊子、丁亥、丙戌、乙酉、甲申、癸未、壬午、辛巳
    const ganzhi = result.dayun!.zhu.map((p) => p.ganzhi);
    expect(ganzhi).toEqual([
      "庚寅", "己丑", "戊子", "丁亥",
      "丙戌", "乙酉", "甲申", "癸未", "壬午", "辛巳",
    ]);
  });

  it("阴年女 2001-03-10 12:00 -> 顺行（阴年女顺）", () => {
    const result = paipan({ year: 2001, month: 3, day: 10, hour: 12, minute: 0, gender: "女" });
    expect(result.dayun!.direction).toBe("顺");
    // 月柱辛卯顺推 10 柱：壬辰、癸巳、甲午、乙未、丙申、丁酉、戊戌、己亥、庚子、辛丑
    const ganzhi = result.dayun!.zhu.map((p) => p.ganzhi);
    expect(ganzhi).toEqual([
      "壬辰", "癸巳", "甲午", "乙未",
      "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑",
    ]);
  });
});

describe("排盘 - 起运岁命例 (T6)", () => {
  // 起运岁由出生时刻到最近一节的天数按 3 天折 1 年折算，精确到年+月。
  // 2000-02-05 04:41 在立春（02-04 20:40:24）后，顺行数到惊蛰（03-05 14:42:40）。
  // 约 29.42 天 -> 29.42*4 ≈ 118 月 -> 9 岁 9 月（四舍五入前保留完整秒精度）。
  it("立春后出生阳男 -> 顺行数到惊蛰，起运 9岁9月", () => {
    const result = paipan({ year: 2000, month: 2, day: 5, hour: 4, minute: 41, gender: "男" });
    expect(result.dayun!.direction).toBe("顺");
    expect(result.dayun!.qiyun).toEqual({ ageYears: 9, ageMonths: 9 });
  });

  // 逆行命例：2000-01-01 12:00 庚辰年（实为 1999 己卯年，立春前）男 -> 阳年男顺
  // 还是阴年？1999 己卯，己=5 奇数序号 -> 阴年男 -> 逆。
  // 2000-01-01 12:00 时属 1999 年（立春前），年柱 己卯-> 阴年男 -> 逆行。
  // 逆行数到上一节（小寒 2000-01-06 17:00？不对，1-01 在小寒前，上一节应是大雪 1999-12-07）。
  it("立春前出生（1999己卯阴年）男 -> 逆行（按归属年干己判定）", () => {
    const result = paipan({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: "男" });
    expect(result.nianzhu).toBe("己卯"); // 立春前归 1999 阴年
    expect(result.dayun!.direction).toBe("逆"); // 阴年男逆
  });

  it("交节当秒顺行取严格下一节、逆行取严格上一节，起运间隔不为零", () => {
    const birthTime = beijingDateTime({
      year: 2000, month: 2, day: 4, hour: 20, minute: 40, second: 24,
    });
    const forward = dayun({
      yuezhu: "戊寅",
      yearTianganIndex: 6,
      gender: "男",
      birthTime,
    });
    const backward = dayun({
      yuezhu: "戊寅",
      yearTianganIndex: 6,
      gender: "女",
      birthTime,
    });

    expect(forward.qiyun).toEqual({ ageYears: 9, ageMonths: 11 });
    expect(backward.qiyun).toEqual({ ageYears: 9, ageMonths: 9 });
  });
});

describe("排盘 - 无性别不算大运 (T6)", () => {
  it("未给 gender -> 大运 undefined，四柱仍正常", () => {
    const result = paipan({ year: 2000, month: 3, day: 10, hour: 12, minute: 0 });
    expect(result.dayun).toBeUndefined();
    expect(result.nianzhu).toBe("庚辰");
    expect(result.yuezhu).toBe("己卯");
  });
});

describe("大运 - 纯函数单测 (T6)", () => {
  // 直接调用 大运 纯函数，绕过排盘前置。
  it("月柱 戊寅、阳年（年干戊=4 阳年）男顺行 -> 第 0 柱 己卯", () => {
    const r = dayun({
      yuezhu: "戊寅",
      yearTianganIndex: 4,
      gender: "男",
      birthTime: beijingDateTime({
        year: 2000, month: 2, day: 5, hour: 4, minute: 41, second: 0,
      }),
    });
    expect(r.direction).toBe("顺");
    expect(r.zhu[0]!.ganzhi).toBe("己卯");
  });

  it("大运方向穷举：偶数年干男顺、奇数年干男逆", () => {
    const males: Gender = "男";
    expect(determineDayunDirection(males, 0)).toBe("顺"); // 甲
    expect(determineDayunDirection(males, 2)).toBe("顺"); // 丙
    expect(determineDayunDirection(males, 4)).toBe("顺"); // 戊
    expect(determineDayunDirection(males, 6)).toBe("顺"); // 庚
    expect(determineDayunDirection(males, 8)).toBe("顺"); // 壬
    expect(determineDayunDirection(males, 1)).toBe("逆"); // 乙
    expect(determineDayunDirection(males, 3)).toBe("逆"); // 丁
    expect(determineDayunDirection(males, 5)).toBe("逆"); // 己
    expect(determineDayunDirection(males, 7)).toBe("逆"); // 辛
    expect(determineDayunDirection(males, 9)).toBe("逆"); // 癸
  });

  it("大运方向穷举：偶数年干女逆、奇数年干女顺", () => {
    const f: Gender = "女";
    expect(determineDayunDirection(f, 0)).toBe("逆");
    expect(determineDayunDirection(f, 7)).toBe("顺"); // 辛阴年女顺
    expect(determineDayunDirection(f, 5)).toBe("顺"); // 己阴年女顺
  });
});
