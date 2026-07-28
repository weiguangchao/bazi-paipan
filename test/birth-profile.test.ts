import { describe, it, expect } from "vitest";
import { parse, type BirthDataInput } from "@/domain/birth/birth-profile";
import { fromUrlParams, toUrlParams } from "@/pages/paipan/url-params";

const NOW = { year: 2026, month: 7 };

describe("fromUrlParams - 无效参数静默忽略", () => {
  it("合法参数恢复为字符串默认值", () => {
    const params = new URLSearchParams({
      date: "2000-01-01", time: "12:00", gender: "男", province: "北京市", city: "市辖区",
    });
    expect(fromUrlParams(params)).toEqual({
      date: "2000-01-01", time: "12:00", gender: "男", province: "北京市", city: "市辖区",
    });
  });

  it("非法日期被忽略为 undefined", () => {
    const params = new URLSearchParams({ date: "2200-13-45", time: "12:00", gender: "男" });
    expect(fromUrlParams(params).date).toBeUndefined();
  });

  it("正式范围外日期不会从 URL 恢复", () => {
    expect(fromUrlParams(new URLSearchParams({ date: "1800-12-31" })).date)
      .toBeUndefined();
    expect(fromUrlParams(new URLSearchParams({ date: "2100-01-01" })).date)
      .toBeUndefined();
  });

  it("非法时间被忽略为 undefined", () => {
    const params = new URLSearchParams({ date: "2000-01-01", time: "25:99", gender: "男" });
    expect(fromUrlParams(params).time).toBeUndefined();
  });

  it("非法性别被忽略为 undefined", () => {
    const params = new URLSearchParams({ date: "2000-01-01", time: "12:00", gender: "X" });
    expect(fromUrlParams(params).gender).toBeUndefined();
  });

  it("缺失参数恢复为 undefined，其余有效参数仍恢复", () => {
    const params = new URLSearchParams({ time: "08:30" });
    const restored = fromUrlParams(params);
    expect(restored.time).toBe("08:30");
    expect(restored.date).toBeUndefined();
    expect(restored.gender).toBeUndefined();
    expect(restored.province).toBeUndefined();
    expect(restored.city).toBeUndefined();
  });

  it("空省市恢复为 undefined", () => {
    const params = new URLSearchParams({ date: "2000-01-01", time: "12:00", gender: "女", province: "", city: "" });
    const restored = fromUrlParams(params);
    expect(restored.province).toBeUndefined();
    expect(restored.city).toBeUndefined();
  });
});

describe("toUrlParams - 序列化与格式", () => {
  it("写入 date/time/gender，省市同时给时才写入", () => {
    const input: BirthDataInput = {
      date: "2000-01-01", time: "12:00", gender: "男", province: "北京市", city: "市辖区",
    };
    const params = toUrlParams(input);
    expect(params.get("date")).toBe("2000-01-01");
    expect(params.get("time")).toBe("12:00");
    expect(params.get("gender")).toBe("男");
    expect(params.get("province")).toBe("北京市");
    expect(params.get("city")).toBe("市辖区");
  });

  it("省市缺失时不写入 province/city", () => {
    const input: BirthDataInput = { date: "2000-01-01", time: "12:00", gender: "女", province: "", city: "" };
    const params = toUrlParams(input);
    expect(params.has("province")).toBe(false);
    expect(params.has("city")).toBe(false);
  });

  it("与 fromUrlParams 往返一致（合法值）", () => {
    const input: BirthDataInput = {
      date: "1990-05-15", time: "16:00", gender: "男", province: "北京市", city: "市辖区",
    };
    expect(fromUrlParams(toUrlParams(input))).toEqual({ ...input, province: "北京市", city: "市辖区" });
  });
});

describe("parse - 字段级错误与 typed 值", () => {
  it("成功返回 typed 出生资料", () => {
    const r = parse({ date: "2000-01-01", time: "12:00", gender: "男", province: "北京市", city: "市辖区" }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      year: 2000, month: 1, day: 1, hour: 12, minute: 0,
      gender: "男", birthplace: { province: "北京市", city: "市辖区" },
    });
  });

  it.each(["1801-01-01", "2099-12-31"])("接受正式范围边界 %s", (date) => {
    const result = parse(
      { date, time: "12:00", gender: "男", province: "", city: "" },
      NOW,
    );
    expect(result.ok).toBe(true);
  });

  it.each(["1800-12-31", "2100-01-01"])("拒绝正式范围外日期 %s", (date) => {
    const result = parse(
      { date, time: "12:00", gender: "男", province: "", city: "" },
      NOW,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields.date).toBeDefined();
  });

  it("失败返回字段级错误，不含 typed 值", () => {
    const r = parse({ date: "2000-13-45", time: "25:99", gender: "", province: "四川省", city: "" }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fields.date).toBeDefined();
    expect(r.fields.time).toBeDefined();
    expect(r.fields.gender).toBeDefined();
    expect(r.fields.province).toBeDefined();
    expect(r.fields.city).toBeDefined();
  });
});

describe("parse - 字段校验失败（从 api 层迁入）", () => {
  it("无效日期 -> fields.date", () => {
    const r = parse({ date: "2000-13-45", time: "12:00", gender: "男", province: "", city: "" }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fields.date).toBeDefined();
  });

  it("无效时间 -> fields.time", () => {
    const r = parse({ date: "2000-01-01", time: "25:99", gender: "男", province: "", city: "" }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fields.time).toBeDefined();
  });

  it("缺失性别 -> fields.gender", () => {
    const r = parse({ date: "2000-01-01", time: "12:00", gender: "", province: "", city: "" }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fields.gender).toBeDefined();
  });

  it("超出 2099 正式支持范围 -> fields.date", () => {
    const r = parse({ date: "2200-01-01", time: "12:00", gender: "男", province: "", city: "" }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fields.date).toBeDefined();
    expect(r.fields.date).toBe("出生日期须为有效公历 YYYY-MM-DD");
  });

  it("未知省份 -> fields.province", () => {
    const r = parse({ date: "2000-01-01", time: "12:00", gender: "男", province: "火星省", city: "某市" }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fields.province).toBeDefined();
    expect(r.fields.city).toBeUndefined();
  });

  it("省市不匹配 -> fields.city", () => {
    const r = parse({ date: "2000-01-01", time: "12:00", gender: "男", province: "四川省", city: "不存在的市" }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fields.city).toBeDefined();
    expect(r.fields.province).toBeUndefined();
  });

  it("只给省不给市 -> fields 同时标记", () => {
    const r = parse({ date: "2000-01-01", time: "12:00", gender: "男", province: "四川省", city: "" }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fields.province).toBeDefined();
    expect(r.fields.city).toBeDefined();
  });

  it("字段错误时 fields 只含 invalid 字段", () => {
    const r = parse({ date: "2000-01-01", time: "12:00", gender: "男", province: "火星省", city: "某市" }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.fields)).toEqual(["province"]);
  });
});
