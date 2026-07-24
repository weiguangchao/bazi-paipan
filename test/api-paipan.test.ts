import { describe, it, expect, vi } from "vitest";
import { computePaipan, type PaipanInput } from "../src/api/paipan.js";

function postPaipan(input: PaipanInput) {
  return computePaipan(input);
}

describe("computePaipan - 成功响应", () => {
  // 2000-01-01 12:00 北京市/市辖区 男：年柱 己卯、月柱 丙子、日柱 戊午、时柱 戊午
  it("成功排盘返回完整 data 结构与代表值", async () => {
    const result = await postPaipan({
      date: "2000-01-01",
      time: "12:00",
      gender: "男",
      province: "北京市",
      city: "市辖区",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data;
    // input 回显
    expect(data.input.date).toBe("2000-01-01");
    expect(data.input.time).toBe("12:00");
    expect(data.input.gender).toBe("男");
    expect(data.input.province).toBe("北京市");
    expect(data.input.city).toBe("市辖区");

    // personal：直接使用原始公历生日；2000-01-01 属龙且为摩羯座
    expect(data.personal).toEqual({ shengxiao: "龙", zodiacSign: "摩羯座" });

    // sizhu：四柱干支与既有命例一致
    expect(data.sizhu.year.ganzhi).toBe("己卯");
    expect(data.sizhu.month.ganzhi).toBe("丙子");
    expect(data.sizhu.day.ganzhi).toBe("戊午");
    expect(data.sizhu.hour.ganzhi).toBe("戊午");

    // 日柱天干位标日主，不标十神
    expect(data.sizhu.day.shishen).toBe("日主");
    // 年柱天干十神：己相对戊日主为劫财
    expect(data.sizhu.year.shishen).toBe("劫财");
    // 藏干与副星由 API 分字段返回：卯藏乙，乙相对戊日主为正官
    expect(data.sizhu.year.canggan).toEqual([{ tiangan: "乙", shishen: "正官" }]);

    // tips：给出出生地 -> TRUE_SOLAR_TIME 提示
    expect(data.tips).toBeInstanceOf(Array);
    expect(data.tips.some((t) => t.code === "TRUE_SOLAR_TIME")).toBe(true);

    // dayun：方向、起运岁、10 柱
    expect(data.dayun.direction).toBe("逆"); // 1999己卯阴年男 -> 逆
    expect(data.dayun.qiyun.ageYears).toBeTypeOf("number");
    expect(data.dayun.zhu).toHaveLength(10);
    // 每柱含起运信息、天干/地支本气十神和十个大运关联流年
    const z0 = data.dayun.zhu[0]!;
    expect(z0.ganzhi).toBeTypeOf("string");
    expect(z0.tianganShishen).toBeTypeOf("string");
    expect(z0.dizhiShishen).toBeTypeOf("string");
    expect(z0.qiyun.ageYears).toBeTypeOf("number");
    expect(z0.qiyun.ageMonths).toBeTypeOf("number");
    expect(z0.startYear).toBeTypeOf("number");
    expect(z0.startMonth).toBeTypeOf("number");
    expect(z0.isCurrent).toBeTypeOf("boolean");

    expect(z0.liunian).toHaveLength(10);
    expect(z0.liunian.map((item) => item.year)).toEqual(
      Array.from({ length: 10 }, (_, i) => z0.startYear + i),
    );
    expect(z0.liunian[0]!.tianganShishen).toBeTypeOf("string");
    expect(z0.liunian[0]!.dizhiShishen).toBeTypeOf("string");
    expect(z0.liunian[0]!.isCurrentYear).toBeTypeOf("boolean");

    for (const dayunzhu of data.dayun.zhu) {
      expect(dayunzhu.liunian).toHaveLength(10);
      expect(dayunzhu.liunian[0]!.year).toBe(dayunzhu.startYear);
      expect(dayunzhu.liunian[9]!.year).toBe(dayunzhu.startYear + 9);
    }
    expect(data.dayun.zhu.flatMap((item) => item.liunian).filter((item) => item.isCurrentYear)).toHaveLength(1);
    expect(data.dayun.zhu.filter((item) => item.isCurrent)).toHaveLength(1);
  });

  it("生肖按原始公历年计算，不读取立春前的年柱地支", async () => {
    const result = await postPaipan({
      date: "2000-01-01",
      time: "12:00",
      gender: "男",
      province: "",
      city: "",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sizhu.year.ganzhi).toBe("己卯");
    expect(result.data.personal.shengxiao).toBe("龙");
  });

  it("星座按原始公历月日计算，不随真太阳时跨日", async () => {
    const birthData = {
      date: "2026-11-22",
      time: "23:20",
      gender: "男",
    };
    const clock = await postPaipan({ ...birthData, province: "", city: "" });
    const trueSolarTime = await postPaipan({
      ...birthData,
      province: "黑龙江省",
      city: "双鸭山市",
    });

    expect(clock.ok).toBe(true);
    expect(trueSolarTime.ok).toBe(true);
    if (!clock.ok || !trueSolarTime.ok) return;
    expect(trueSolarTime.data.sizhu.day.ganzhi)
      .not.toBe(clock.data.sizhu.day.ganzhi);
    expect(trueSolarTime.data.personal.zodiacSign).toBe("天蝎座");
  });

  it("空省市 -> 钟表时排盘，NO_LONGITUDE_CORRECTION 提示", async () => {
    const result = await postPaipan({
      date: "2000-01-01",
      time: "12:00",
      gender: "男",
      province: "",
      city: "",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sizhu.year.ganzhi).toBe("己卯");
    expect(result.data.sizhu.month.ganzhi).toBe("丙子");
    expect(result.data.sizhu.day.ganzhi).toBe("戊午");
    expect(result.data.sizhu.hour.ganzhi).toBe("戊午");
    expect(result.data.tips.some((t) => t.code === "NO_LONGITUDE_CORRECTION")).toBe(true);
    expect(result.data.dayun.direction).toBe("逆");
    expect(result.data.dayun.zhu).toHaveLength(10);
    for (const dayunzhu of result.data.dayun.zhu) {
      expect(dayunzhu.liunian).toHaveLength(10);
      expect(dayunzhu.liunian[0]!.year).toBe(dayunzhu.startYear);
      expect(dayunzhu.liunian[9]!.year).toBe(dayunzhu.startYear + 9);
    }
    expect(result.data.ganzhiRelations).toEqual({
      tiangan: [],
      dizhi: [
        {
          type: "dizhiliuchong",
          members: ["子", "午"],
          text: "子午冲",
        },
        {
          type: "dizhixiangxing",
          members: ["子", "卯"],
          text: "子卯刑",
        },
        {
          type: "dizhixiangxing",
          members: ["午", "午"],
          text: "午午自刑",
        },
      ],
    });
  });

  it.each([
    {
      date: "1990-01-01",
      time: "16:00",
      sizhu: ["己巳", "丙子", "丙寅", "丙申"],
      dizhi: [
        { type: "dizhiliuchong", members: ["寅", "申"], text: "寅申冲" },
        { type: "dizhiliuhe", members: ["巳", "申"], text: "巳申合" },
        { type: "dizhibansanhe", members: ["申", "子"], text: "申子半三合" },
        { type: "dizhixiangxing", members: ["寅", "巳", "申"], text: "寅巳申三刑" },
      ],
    },
    {
      date: "1990-01-06",
      time: "20:00",
      sizhu: ["己巳", "丁丑", "辛未", "戊戌"],
      dizhi: [
        { type: "dizhiliuchong", members: ["丑", "未"], text: "丑未冲" },
        { type: "dizhibansanhe", members: ["巳", "丑"], text: "巳丑半三合" },
        { type: "dizhixiangxing", members: ["丑", "戌", "未"], text: "丑戌未三刑" },
      ],
    },
    {
      date: "2000-01-01",
      time: "12:00",
      sizhu: ["己卯", "丙子", "戊午", "戊午"],
      dizhi: [
        { type: "dizhiliuchong", members: ["子", "午"], text: "子午冲" },
        { type: "dizhixiangxing", members: ["子", "卯"], text: "子卯刑" },
        { type: "dizhixiangxing", members: ["午", "午"], text: "午午自刑" },
      ],
    },
    {
      date: "2000-01-09",
      time: "02:00",
      sizhu: ["己卯", "丁丑", "丙寅", "己丑"],
      dizhi: [],
    },
  ])("$date $time 男按公开契约返回精确地支关系", async ({ date, time, sizhu, dizhi }) => {
    const result = await postPaipan({
      date,
      time,
      gender: "男",
      province: "",
      city: "",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([
      result.data.sizhu.year.ganzhi,
      result.data.sizhu.month.ganzhi,
      result.data.sizhu.day.ganzhi,
      result.data.sizhu.hour.ganzhi,
    ]).toEqual(sizhu);
    expect(result.data.ganzhiRelations.dizhi).toEqual(dizhi);
    if (dizhi.length === 0) {
      expect(result.data.ganzhiRelations).toEqual({ tiangan: [], dizhi: [] });
    }
  });

  it("无命中时仍返回必有的干支关系空数组", async () => {
    const result = await postPaipan({
      date: "2000-01-09",
      time: "02:00",
      gender: "男",
      province: "",
      city: "",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sizhu.year.ganzhi).toBe("己卯");
    expect(result.data.sizhu.month.ganzhi).toBe("丁丑");
    expect(result.data.sizhu.day.ganzhi).toBe("丙寅");
    expect(result.data.sizhu.hour.ganzhi).toBe("己丑");
    expect(result.data.ganzhiRelations).toEqual({ tiangan: [], dizhi: [] });
  });

  it("当前大运按北京时间起运月份切换", async () => {
    const now = vi.spyOn(Date, "now");
    const input: PaipanInput = {
      date: "1990-05-15", time: "12:00", gender: "男", province: "北京市", city: "市辖区",
    };

    now.mockReturnValue(Date.UTC(2017, 7, 15));
    const august = await postPaipan(input);
    expect(august.ok).toBe(true);
    if (!august.ok) return;
    expect(august.data.dayun.zhu.findIndex((zhu) => zhu.isCurrent)).toBe(1);

    now.mockReturnValue(Date.UTC(2017, 8, 15));
    const september = await postPaipan(input);
    expect(september.ok).toBe(true);
    if (!september.ok) return;
    expect(september.data.dayun.zhu.findIndex((zhu) => zhu.isCurrent)).toBe(2);

    now.mockRestore();
  });
});

describe("computePaipan - 字段校验失败", () => {
  it("无效日期 -> fields.date", async () => {
    const result = await postPaipan({
      date: "2000-13-45", time: "12:00", gender: "男", province: "", city: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.fields.date).toBeDefined();
    expect(result.error.message).toMatch(/日期/);
  });

  it("无效时间 -> fields.time", async () => {
    const result = await postPaipan({
      date: "2000-01-01", time: "25:99", gender: "男", province: "", city: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.fields.time).toBeDefined();
  });

  it("缺失性别 -> fields.gender", async () => {
    const result = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "", province: "", city: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.fields.gender).toBeDefined();
  });

  it("超出 100 年边界 -> fields.date", async () => {
    const result = await postPaipan({
      date: "2200-01-01", time: "12:00", gender: "男", province: "", city: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.fields.date).toBeDefined();
    expect(result.error.message).toMatch(/100/);
  });
});

describe("computePaipan - 出生地校验失败", () => {
  it("未知省份 -> UNKNOWN_BIRTHPLACE + fields.province", async () => {
    const result = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "火星省", city: "某市",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("UNKNOWN_BIRTHPLACE");
    expect(result.error.fields.province).toBeDefined();
    expect(result.error.fields.city).toBeUndefined();
  });

  it("省市不匹配 -> UNKNOWN_BIRTHPLACE + fields.city", async () => {
    const result = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "四川省", city: "不存在的市",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("UNKNOWN_BIRTHPLACE");
    expect(result.error.fields.city).toBeDefined();
    expect(result.error.fields.province).toBeUndefined();
  });

  it("只给省不给市 -> fields 同时标记", async () => {
    const result = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "四川省", city: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.fields.province).toBeDefined();
    expect(result.error.fields.city).toBeDefined();
  });
});

describe("computePaipan - fields 始终存在", () => {
  it("成功时无 error 字段", async () => {
    const result = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "北京市", city: "市辖区",
    });
    expect(result.ok).toBe(true);
  });

  it("字段错误时 fields 只含 invalid 字段", async () => {
    const result = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "火星省", city: "某市",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.error.fields)).toEqual(["province"]);
  });
});
