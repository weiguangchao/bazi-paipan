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
  it("默认成功排盘显示四柱/大运/流年", async () => {
    const page = await newPage({ width: 1280, height: 900 });
    await page.click('button[type="submit"]');
    await page.waitForSelector("#result-sizhu:not([hidden])", { timeout: 5000 });

    const pillarLabels = await page.$$eval("#sizhu-grid .sizhu-column-label", els =>
      els.map(e => e.textContent)
    );
    expect(pillarLabels).toEqual(["年柱", "月柱", "日柱", "时柱"]);

    const rowLabels = await page.$$eval("#sizhu-grid .sizhu-row-label", els =>
      els.map(e => e.textContent)
    );
    expect(rowLabels).toEqual(["日期", "主星", "天干", "地支", "藏干", "副星"]);
    expect(await page.locator("#sizhu-grid .sizhu-canggan").first().textContent()).toContain("乙");
    expect(await page.locator("#sizhu-grid .sizhu-fuxing").first().textContent()).toContain("正官");

    expect(await page.locator("#result-tips").count()).toBe(0);
    expect(await page.locator("#dayun-grid .pillar-card").count()).toBe(10);
    expect(await page.locator("#liunian-grid .pillar-card").count()).toBe(10);
    expect(await page.locator("#dayun-grid .pillar-card.is-selected").count()).toBe(1);

    const selectedStartYear = Number(await page.locator("#dayun-grid .pillar-card.is-selected").getAttribute("data-start-year"));
    const visibleYears = await page.locator("#liunian-grid .pillar-year").evaluateAll((els) =>
      els.map((el) => el.firstChild!.textContent!.trim()),
    );
    expect(visibleYears).toEqual(Array.from({ length: 10 }, (_, i) => String(selectedStartYear + i)));

    await page.close();
  });

  it("四柱藏干不显示五行 emoji，天干地支保留", async () => {
    const page = await newPage({ width: 1280, height: 900 });
    await page.click('button[type="submit"]');
    await page.waitForSelector("#result-sizhu:not([hidden])", { timeout: 5000 });

    const cangganAfterContent = await page.locator("#sizhu-grid .sizhu-canggan > div").evaluateAll((els) =>
      els.map((el) => getComputedStyle(el, "::after").content),
    );
    expect(cangganAfterContent).toEqual(cangganAfterContent.map(() => "none"));

    const ganzhiAfterContent = await page.locator("#sizhu-grid .sizhu-gan, #sizhu-grid .sizhu-zhi").evaluateAll((els) =>
      els.map((el) => getComputedStyle(el, "::after").content),
    );
    expect(ganzhiAfterContent.every((content) => content !== "none")).toBe(true);

    await page.close();
  });

  it("今年不在十步范围时默认选择第一步", async () => {
    const page = await newPage({ width: 1280, height: 900 });
    await page.fill("#date", "2100-01-01");
    await page.click('button[type="submit"]');
    await page.waitForSelector("#result-dayun:not([hidden])", { timeout: 5000 });

    const selectedIndex = await page.locator("#dayun-grid .pillar-card.is-selected").getAttribute("data-index");
    expect(selectedIndex).toBe("0");
    expect(await page.locator("#dayun-grid .current-dayun-badge").count()).toBe(0);
    const firstStartYear = Number(await page.locator("#dayun-grid .pillar-card").first().getAttribute("data-start-year"));
    const visibleYears = await page.locator("#liunian-grid .pillar-year").evaluateAll((els) =>
      els.map((el) => el.firstChild!.textContent!.trim()),
    );
    expect(visibleYears[0]).toBe(String(firstStartYear));

    await page.close();
  });

  it("当前大运 tag 独立于用户选择态", async () => {
    const page = await newPage({ width: 1280, height: 900 });
    await page.click('button[type="submit"]');
    await page.waitForSelector("#dayun-grid .dayun-card", { timeout: 5000 });

    const badge = page.locator("#dayun-grid .current-dayun-badge");
    expect(await badge.count()).toBe(1);
    expect(await badge.textContent()).toBe("当前");
    const currentCard = badge.locator("xpath=ancestor::button[1]");
    const currentIndex = await currentCard.getAttribute("data-index");
    expect(await currentCard.getAttribute("aria-pressed")).toBe("true");

    const otherIndex = currentIndex === "0" ? 1 : 0;
    await page.locator("#dayun-grid .dayun-card").nth(otherIndex).click();
    expect(await page.locator("#dayun-grid .dayun-card.is-selected").getAttribute("data-index")).toBe(String(otherIndex));
    expect(await badge.locator("xpath=ancestor::button[1]").getAttribute("data-index")).toBe(currentIndex);

    await page.close();
  });

  it("大运选择按钮支持点击、Enter 与 Space 并更新关联流年", async () => {
    const page = await newPage({ width: 1280, height: 900 });
    await page.click('button[type="submit"]');
    await page.waitForSelector("#dayun-grid button.dayun-card", { timeout: 5000 });

    const buttons = page.locator("#dayun-grid button.dayun-card");
    expect(await buttons.count()).toBe(10);

    async function expectSelected(index: number) {
      const button = buttons.nth(index);
      const startYear = Number(await button.getAttribute("data-start-year"));
      expect(await button.getAttribute("aria-pressed")).toBe("true");
      expect(await page.locator("#liunian-grid .pillar-year").first().evaluate((el) => el.firstChild!.textContent!.trim())).toBe(String(startYear));
    }

    await buttons.nth(1).click();
    await expectSelected(1);
    await buttons.nth(2).focus();
    await page.keyboard.press("Enter");
    await expectSelected(2);
    await buttons.nth(3).focus();
    await page.keyboard.press("Space");
    await expectSelected(3);

    await page.close();
  });

  it("大运与流年卡片遵循文字层级、十神简写与只读语义", async () => {
    const page = await newPage({ width: 1280, height: 900 });
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/paipan") && response.request().method() === "POST",
    );
    await page.click('button[type="submit"]');
    const responseData = (await (await responsePromise).json()).data;
    await page.waitForSelector("#dayun-grid .dayun-card", { timeout: 5000 });

    const firstDayun = page.locator("#dayun-grid .dayun-card").first();
    expect(await firstDayun.locator(":scope > .pillar-year").textContent()).toMatch(/^\d{4}$/);
    expect(await firstDayun.locator(":scope > .pillar-age").textContent()).toBe("8~17岁");
    expect(await page.locator("#dayun-info").textContent()).toBe("方向：逆行；起运 8岁");
    expect(await page.locator("#result-dayun").textContent()).not.toMatch(/\d+月/);
    expect(await firstDayun.textContent()).not.toMatch(/第\s*\d+|起运：|藏干|副星|\d{4}年\d+月/);
    expect(await firstDayun.locator(".pillar-row").count()).toBe(2);

    expect(await page.locator("#liunian-grid button").count()).toBe(0);
    expect(await page.locator("#liunian-grid .liunian-card").count()).toBe(10);
    expect(await page.locator("#liunian-grid .liunian-card .pillar-row").count()).toBe(20);
    expect(await page.locator("#liunian-grid .current-year-badge").count()).toBe(1);

    const abbreviationByShishen = {
      "比肩": "比", "劫财": "劫", "食神": "食", "伤官": "伤", "偏财": "才",
      "正财": "财", "七杀": "杀", "正官": "官", "偏印": "枭", "正印": "印",
    };
    const abbreviations = await page.locator("#dayun-grid .pillar-shishen-short, #liunian-grid .pillar-shishen-short").allTextContents();
    const selectedDayun = responseData.dayun.zhu.find((zhu) => zhu.isCurrent) ?? responseData.dayun.zhu[0];
    const expectedAbbreviations = [
      ...responseData.dayun.zhu.flatMap((zhu) => [abbreviationByShishen[zhu.tianganShishen], abbreviationByShishen[zhu.dizhiShishen]]),
      ...selectedDayun.liunian.flatMap((item) => [abbreviationByShishen[item.tianganShishen], abbreviationByShishen[item.dizhiShishen]]),
    ];
    expect(abbreviations).toEqual(expectedAbbreviations);

    const rowOrder = await page.locator("#dayun-grid .pillar-row, #liunian-grid .pillar-row").evaluateAll((rows) => rows.map((row) => ({
      classes: Array.from(row.children, (child) => child.className),
      flexDirection: getComputedStyle(row).flexDirection,
    })));
    expect(rowOrder.every((row) => row.flexDirection === "row" && row.classes[0] === "pillar-character" && row.classes[1] === "pillar-shishen-short")).toBe(true);

    const styles = await page.locator("#dayun-grid .pillar-row").first().evaluate((row) => {
      const character = getComputedStyle(row.querySelector(".pillar-character")!);
      const shishen = getComputedStyle(row.querySelector(".pillar-shishen-short")!);
      return { characterSize: parseFloat(character.fontSize), shishenSize: parseFloat(shishen.fontSize), shishenColor: shishen.color };
    });
    expect(styles.shishenSize).toBeLessThan(styles.characterSize);
    const colors = await page.locator(".pillar-shishen-short").evaluateAll((els) => [...new Set(els.map((el) => getComputedStyle(el).color))]);
    expect(colors).toEqual([styles.shishenColor]);

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
    expect(await page.locator("#sizhu-grid .sizhu-column-label").count()).toBe(4);

    // 无横向溢出
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.close();
  });

  it("窄屏覆盖卡片数量、切换、键盘、信息层级与横向滚动", async () => {
    const page = await newPage({ width: 375, height: 812 });
    await page.click('button[type="submit"]');
    await page.waitForSelector("#dayun-grid .dayun-card", { timeout: 5000 });

    const buttons = page.locator("#dayun-grid .dayun-card");
    expect(await buttons.count()).toBe(10);
    expect(await page.locator("#liunian-grid .liunian-card").count()).toBe(10);
    expect(await buttons.first().locator(":scope > .pillar-year").textContent()).toMatch(/^\d{4}$/);
    expect(await buttons.first().locator(":scope > .pillar-age").textContent()).toBe("8~17岁");
    expect(await buttons.first().locator(".pillar-row").count()).toBe(2);
    expect(await page.locator("#liunian-grid .liunian-card .pillar-row").count()).toBe(20);
    const narrowAbbreviations = await page.locator("#dayun-grid .pillar-shishen-short, #liunian-grid .pillar-shishen-short").allTextContents();
    expect(narrowAbbreviations).toHaveLength(40);
    expect(narrowAbbreviations.every((value) => ["比", "劫", "食", "伤", "才", "财", "杀", "官", "枭", "印"].includes(value))).toBe(true);

    async function expectNarrowSelection(index: number) {
      const button = buttons.nth(index);
      const startYear = await button.getAttribute("data-start-year");
      expect(await button.getAttribute("aria-pressed")).toBe("true");
      expect(await page.locator("#liunian-grid .pillar-year").first().evaluate((el) => el.firstChild!.textContent!.trim())).toBe(startYear);
    }

    await buttons.nth(1).click();
    await expectNarrowSelection(1);
    await buttons.nth(2).focus();
    await page.keyboard.press("Enter");
    await expectNarrowSelection(2);
    await buttons.nth(3).focus();
    await page.keyboard.press("Space");
    await expectNarrowSelection(3);

    for (const selector of ["#dayun-grid", "#liunian-grid"]) {
      const layout = await page.locator(selector).evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          flexWrap: style.flexWrap,
          overflowX: style.overflowX,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        };
      });
      expect(layout.flexWrap).toBe("nowrap");
      expect(["auto", "scroll"]).toContain(layout.overflowX);
      expect(layout.scrollWidth).toBeGreaterThan(layout.clientWidth);
    }

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
