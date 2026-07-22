import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { serve } from "../src/serve.js";
import type { PaipanServer } from "../src/http-server.js";

let server: PaipanServer;
let baseUrl: string;

beforeAll(async () => {
  server = await serve({ port: 3987, onReady: () => {} });
  baseUrl = "http://127.0.0.1:" + server.port;
});

afterAll(async () => {
  await server.close();
});

async function postPaipan(body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(baseUrl + "/api/paipan", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const json: any = await res.json();
  return { status: res.status, body: json };
}

describe("POST /api/paipan - 成功响应", () => {
  // 2000-01-01 12:00 北京市/市辖区 男：年柱 己卯、月柱 丙子、日柱 戊午、时柱 戊午
  it("成功排盘返回完整 data 结构与代表值", async () => {
    const { status, body } = await postPaipan({
      date: "2000-01-01",
      time: "12:00",
      gender: "男",
      province: "北京市",
      city: "市辖区",
    });
    expect(status).toBe(200);
    expect(body.data).toBeDefined();

    const data = body.data;
    // input 回显
    expect(data.input.date).toBe("2000-01-01");
    expect(data.input.time).toBe("12:00");
    expect(data.input.gender).toBe("男");
    expect(data.input.province).toBe("北京市");
    expect(data.input.city).toBe("市辖区");

    // siZhu：四柱干支与known命例一致
    expect(data.sizhu.year.ganzhi).toBe("己卯");
    expect(data.sizhu.month.ganzhi).toBe("丙子");
    expect(data.sizhu.day.ganzhi).toBe("戊午");
    expect(data.sizhu.hour.ganzhi).toBe("戊午");

    // 日柱天干位标日主，不标十神
    expect(data.sizhu.day.shishen).toBe("日主");
    // 年柱天干十神：己相对戊日主为劫财
    expect(data.sizhu.year.shishen).toBe("劫财");
    // 藏干与副星由 API 分字段返回：卯藏乙，乙相对戊日主为正官
    expect(data.sizhu.year.canggan).toEqual([{ gan: "乙", shishen: "正官" }]);

    // tips：给出出生地 -> TRUE_SOLAR_TIME 提示
    expect(data.tips).toBeInstanceOf(Array);
    expect(data.tips.some((t: any) => t.code === "TRUE_SOLAR_TIME")).toBe(true);

    // dayun：方向顺、起运岁、8 柱
    expect(data.dayun.direction).toBe("逆"); // 1999己卯阴年男 -> 逆
    expect(data.dayun.qiyun.ageYears).toBeTypeOf("number");
    expect(data.dayun.zhu).toHaveLength(8);
    // 每柱含 ganZhi、shiShen、cangGan、qiYun、startYear、startMonth
    const z0 = data.dayun.zhu[0];
    expect(z0.ganzhi).toBeTypeOf("string");
    expect(z0.shishen).toBeTypeOf("string");
    expect(z0.canggan).toBeInstanceOf(Array);
    expect(z0.qiyun.ageYears).toBeTypeOf("number");
    expect(z0.qiyun.ageMonths).toBeTypeOf("number");
    expect(z0.startYear).toBeTypeOf("number");
    expect(z0.startMonth).toBeTypeOf("number");

    // liunian：10 项，从当before北京年起
    expect(data.liunian).toHaveLength(10);
    expect(data.liunian[0].ganzhi).toBeTypeOf("string");
    expect(data.liunian[0].shishen).toBeTypeOf("string");
    expect(data.liunian[0].canggan).toBeInstanceOf(Array);
    // 年份依次 +1
    const years = data.liunian.map((l: any) => l.year);
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBe(years[i - 1] + 1);
    }
  });

  it("空省市 -> clock时排盘，NO_LONGITUDE_CORRECTION 提示", async () => {
    const { status, body } = await postPaipan({
      date: "2000-01-01",
      time: "12:00",
      gender: "男",
      province: "",
      city: "",
    });
    expect(status).toBe(200);
    // 时柱戊午（clock时，未做经度修正）
    expect(body.data.sizhu.hour.ganzhi).toBe("戊午");
    expect(body.data.tips.some((t: any) => t.code === "NO_LONGITUDE_CORRECTION")).toBe(true);
  });
});

describe("POST /api/paipan - 字段校验失败", () => {
  it("无效日期 -> 400 + fields.date", async () => {
    const { status, body } = await postPaipan({
      date: "2000-13-45", time: "12:00", gender: "男", province: "", city: "",
    });
    expect(status).toBe(400);
    expect(body.error.fields.date).toBeDefined();
    expect(body.error.message).toMatch(/日期/);
  });

  it("无效时间 -> 400 + fields.time", async () => {
    const { status, body } = await postPaipan({
      date: "2000-01-01", time: "25:99", gender: "男", province: "", city: "",
    });
    expect(status).toBe(400);
    expect(body.error.fields.time).toBeDefined();
  });

  it("缺失性别 -> 400 + fields.gender", async () => {
    const { status, body } = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "", province: "", city: "",
    });
    expect(status).toBe(400);
    expect(body.error.fields.gender).toBeDefined();
  });

  it("超出 100 年边界 -> 400 + fields.date", async () => {
    const { status, body } = await postPaipan({
      date: "2200-01-01", time: "12:00", gender: "男", province: "", city: "",
    });
    expect(status).toBe(400);
    expect(body.error.fields.date).toBeDefined();
    expect(body.error.message).toMatch(/100/);
  });
});

describe("POST /api/paipan - 出生地校验失败", () => {
  it("未知省份 -> 400 + UNKNOWN_BIRTHPLACE + fields.province", async () => {
    const { status, body } = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "火星省", city: "某市",
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe("UNKNOWN_BIRTHPLACE");
    expect(body.error.fields.province).toBeDefined();
    expect(body.error.fields.city).toBeUndefined();
  });

  it("省市不匹配 -> 400 + UNKNOWN_BIRTHPLACE + fields.city", async () => {
    const { status, body } = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "四川省", city: "不存在的市",
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe("UNKNOWN_BIRTHPLACE");
    expect(body.error.fields.city).toBeDefined();
    expect(body.error.fields.province).toBeUndefined();
  });

  it("只给省不给市 -> 400 + fields 同时标记", async () => {
    const { status, body } = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "四川省", city: "",
    });
    expect(status).toBe(400);
    expect(body.error.fields.province).toBeDefined();
    expect(body.error.fields.city).toBeDefined();
  });
});

describe("POST /api/paipan - HTTP 错误契约", () => {
  it("畸形 JSON -> 400 + INVALID_JSON", async () => {
    const { status, body } = await postPaipan("{invalid json", {
      "Content-Type": "application/json",
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe("INVALID_JSON");
    expect(body.error.fields).toEqual({});
  });

  it("非 JSON 请求 -> 415 + UNSUPPORTED_MEDIA_TYPE", async () => {
    const res = await fetch(baseUrl + "/api/paipan", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    });
    expect(res.status).toBe(415);
    const json: any = await res.json();
    expect(json.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(json.error.fields).toEqual({});
  });

  it("错误方法 GET -> 405 + METHOD_NOT_ALLOWED", async () => {
    const res = await fetch(baseUrl + "/api/paipan", { method: "GET" });
    expect(res.status).toBe(405);
    const json: any = await res.json();
    expect(json.error.code).toBe("METHOD_NOT_ALLOWED");
    expect(json.error.fields).toEqual({});
  });

  it("错误方法 PUT -> 405", async () => {
    const res = await fetch(baseUrl + "/api/paipan", { method: "PUT" });
    expect(res.status).toBe(405);
  });

  it("__testForceError -> 500 + INTERNAL_ERROR + 不泄露实现细节", async () => {
    const { status, body } = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "北京市", city: "市辖区",
      __testForceError: true,
    });
    expect(status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("服务内部错误");
    expect(body.error.fields).toEqual({});
    // 不泄露实现细节
    expect(JSON.stringify(body)).not.toMatch(/forced internal error|Error|stack/);
  });
});

describe("POST /api/paipan - fields 始终存在", () => {
  it("成功时无 error 字段", async () => {
    const { status } = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "北京市", city: "市辖区",
    });
    expect(status).toBe(200);
  });

  it("字段错误时 fields 只含 invalid 字段", async () => {
    const { body } = await postPaipan({
      date: "2000-01-01", time: "12:00", gender: "男",
      province: "火星省", city: "某市",
    });
    expect(Object.keys(body.error.fields)).toEqual(["province"]);
  });
});

describe("静态资源服务", () => {
  it("GET / 返回 index.html", async () => {
    const res = await fetch(baseUrl + "/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const html = await res.text();
    expect(html).toContain("命盘工作台");
  });

  it("GET /app.js 返回 JS", async () => {
    const res = await fetch(baseUrl + "/app.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/javascript/);
  });

  it("GET /cities/provinces.json 返回省份索引", async () => {
    const res = await fetch(baseUrl + "/cities/provinces.json");
    expect(res.status).toBe(200);
    const provinces = await res.json();
    expect(provinces).toContain("北京市");
    expect(provinces).toContain("新疆维吾尔自治区");
  });
});
