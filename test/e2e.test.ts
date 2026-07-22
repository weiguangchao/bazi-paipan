// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser } from "playwright";
import { serve } from "../src/serve.js";
import type { PaipanServer } from "../src/http-server.js";

let browser: Browser;
let server: PaipanServer;
let baseUrl: string;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  server = await serve({ port: 4933, onReady: () => {} });
  baseUrl = "http://127.0.0.1:" + server.port;
});

afterAll(async () => {
  await browser.close();
  await server.close();
});

async function newPage(viewport: { width: number; height: number }) {
  const page = await browser.newPage({ viewport });
  await page.goto(baseUrl + "/");
  await page.waitForLoadState("networkidle");
  return page;
}

describe("E2E - 桌面 viewport (1280x900)", () => {
  it("默认成功排盘显示四柱/提示/大运/流年", async () => {
    const page = await newPage({ width: 1280, height: 900 });
    await page.click('button[type="submit"]');
    await page.waitForSelector("#result-sizhu:not([hidden])", { timeout: 5000 });

    const pillarLabels = await page.$$eval("#sizhu-grid .pillar-card .pillar-label", els =>
      els.map(e => e.textContent)
    );
    expect(pillarLabels).toEqual(["年柱", "月柱", "日柱", "时柱"]);

    expect(await page.isVisible("#result-tips:not([hidden])")).toBe(true);
    expect(await page.locator("#dayun-grid .pillar-card").count()).toBe(8);
    expect(await page.locator("#liunian-grid .pillar-card").count()).toBe(10);

    await page.close();
  });

  it("省市联动与清空", async () => {
    const page = await newPage({ width: 1280, height: 900 });

    // Default 北京市/市辖区
    expect(await page.inputValue("#province")).toBe("北京市");
    expect(await page.inputValue("#city")).toBe("市辖区");

    // 切到四川省 -> 城市重新加载
    await page.selectOption("#province", "四川省");
    await page.waitForTimeout(500);
    const sichuanCities = await page.locator("#city option").count();
    expect(sichuanCities).toBeGreaterThan(1);

    // 清空省份 -> 城市禁用，两者均空
    await page.selectOption("#province", "");
    await page.waitForTimeout(300);
    expect(await page.isDisabled("#city")).toBe(true);
    expect(await page.inputValue("#province")).toBe("");
    expect(await page.inputValue("#city")).toBe("");

    await page.close();
  });

  it("字段错误反馈", async () => {
    const page = await newPage({ width: 1280, height: 900 });

    // 清空日期提交
    await page.evaluate(() => { document.getElementById("date")!.value = ""; });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    const dateError = await page.textContent('[data-field="date"]');
    expect(dateError).toContain("日期");
    expect(await page.isVisible("#general-error:not([hidden])")).toBe(true);

    await page.close();
  });

  it("出生地错误反馈", async () => {
    const page = await newPage({ width: 1280, height: 900 });

    // 选择省份但清空城市
    await page.selectOption("#province", "四川省");
    await page.waitForTimeout(500);
    await page.evaluate(() => { document.getElementById("city")!.value = ""; });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    const provError = await page.textContent('[data-field="province"]');
    const cityError = await page.textContent('[data-field="city"]');
    expect(provError).toBeTruthy();
    expect(cityError).toBeTruthy();

    await page.close();
  });

  it("无横向溢出", async () => {
    const page = await newPage({ width: 1280, height: 900 });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.close();
  });
});

describe("E2E - 窄屏 viewport (375x812)", () => {
  it("窄屏可完成填写与排盘阅读，无横向溢出", async () => {
    const page = await newPage({ width: 375, height: 812 });

    // 填写并提交
    await page.click('button[type="submit"]');
    await page.waitForSelector("#result-sizhu:not([hidden])", { timeout: 5000 });

    // 四柱可见
    expect(await page.locator("#sizhu-grid .pillar-card").count()).toBe(4);

    // 无横向溢出
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.close();
  });

  it("窄屏省市联动可用", async () => {
    const page = await newPage({ width: 375, height: 812 });

    await page.selectOption("#province", "四川省");
    await page.waitForTimeout(500);
    const cityCount = await page.locator("#city option").count();
    expect(cityCount).toBeGreaterThan(1);

    await page.close();
  });
});
