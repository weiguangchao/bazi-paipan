// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
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

async function selectBeijingBirthplace(page: Page) {
  await page.selectOption("#province", "北京市");
  await page.waitForFunction(() => (document.getElementById("city") as HTMLSelectElement).value === "市辖区");
}

async function expectCityUnselected(page: Page) {
  expect(await page.isDisabled("#city")).toBe(true);
  expect(await page.inputValue("#city")).toBe("");
  expect(await page.locator("#city option").textContent()).toBe("请先选择省份");
}

async function submitBirthData(page: Page, date: string, time: string) {
  await page.fill("#date", date);
  await page.fill("#time", time);
  await page.click('button[type="submit"]');
  await page.waitForSelector("#result-ganzhi-relations:not([hidden])", { timeout: 5000 });
}

async function expectPersonalInfo(viewport: { width: number; height: number }) {
  const page = await newPage(viewport);
  await submitBirthData(page, "2000-01-01", "12:00");

  expect(await page.locator("#result-personal h2").textContent()).toBe("个人");
  expect(await page.locator("#personal-info .personal-label").allTextContents())
    .toEqual(["生肖", "星座"]);
  expect(await page.locator("#personal-info .personal-value").allTextContents())
    .toEqual(["龙", "摩羯座"]);
  expect(await page.locator(".result-panel > section").evaluateAll((sections) =>
    sections.slice(0, 2).map((section) => section.id)
  )).toEqual(["result-personal", "result-sizhu"]);

  const personalColumns = await page.locator("#personal-info").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").length
  );
  expect(personalColumns).toBe(2);
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  )).toBe(true);
  await page.close();
}

async function expectRealGanzhiRelations(viewport: { width: number; height: number }) {
  const nonEmptyPage = await newPage(viewport);
  await submitBirthData(nonEmptyPage, "2000-01-01", "12:00");
  expect(await nonEmptyPage.locator("#result-ganzhi-relations h2").textContent()).toBe("干支留意");
  expect(await nonEmptyPage.locator("#ganzhi-relations .relation-row-label").allTextContents())
    .toEqual(["天干留意", "地支留意"]);
  expect(await nonEmptyPage.locator("#ganzhi-relations .relation-tag").allTextContents())
    .toEqual(["子午冲"]);
  expect(await nonEmptyPage.locator("#result-sizhu").isVisible()).toBe(true);
  expect(await nonEmptyPage.locator("#result-dayun").isVisible()).toBe(true);
  expect(await nonEmptyPage.locator("#result-liunian").isVisible()).toBe(true);
  expect(await nonEmptyPage.locator(".result-panel > section").evaluateAll((sections) =>
    sections.map((section) => section.id)
  )).toEqual([
    "result-personal",
    "result-sizhu",
    "result-ganzhi-relations",
    "result-dayun",
    "result-liunian",
  ]);
  await nonEmptyPage.close();

  const emptyPage = await newPage(viewport);
  await submitBirthData(emptyPage, "2000-01-09", "02:00");
  expect(await emptyPage.locator("#ganzhi-relations .relation-row-label").allTextContents())
    .toEqual(["天干留意", "地支留意"]);
  expect(await emptyPage.locator("#ganzhi-relations .relation-empty").allTextContents())
    .toEqual(["无须留意", "无须留意"]);
  await emptyPage.close();
}

async function expectDenseGanzhiRelations(
  viewport: { width: number; height: number },
  shouldWrap: boolean,
) {
  const baseResponse = await fetch(baseUrl + "/api/paipan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2000-01-01", time: "12:00", gender: "男", province: "", city: "",
    }),
  }).then((response) => response.json());
  const tiangan = [
    { type: "tianganxiangke", members: ["己", "壬"], text: "己克壬" },
    { type: "tianganxiangke", members: ["庚", "甲"], text: "庚克甲" },
    { type: "tianganxiangke", members: ["辛", "乙"], text: "辛克乙" },
    { type: "tianganwuhe", members: ["甲", "己"], text: "甲己合" },
    { type: "tianganwuhe", members: ["丙", "辛"], text: "丙辛合" },
  ];
  const dizhi = [
    { type: "dizhiliuchong", members: ["子", "午"], text: "子午冲" },
    { type: "dizhiliuchong", members: ["卯", "酉"], text: "卯酉冲" },
    { type: "dizhiliuhe", members: ["辰", "酉"], text: "辰酉合" },
    { type: "dizhisanhe", members: ["申", "子", "辰"], text: "申子辰三合" },
    { type: "dizhibansanhe", members: ["亥", "未"], text: "亥未半三合" },
    { type: "dizhibansanhe", members: ["寅", "戌"], text: "寅戌半三合" },
  ];
  baseResponse.data.ganzhiRelations = { tiangan, dizhi };

  const page = await browser.newPage({ viewport });
  await page.route("**/api/paipan", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(baseResponse),
  }));
  await page.goto(baseUrl + "/");
  await page.waitForLoadState("networkidle");
  await submitBirthData(page, "2000-01-01", "12:00");

  expect(await page.locator("#ganzhi-relations .relation-tag").allTextContents())
    .toEqual([...tiangan, ...dizhi].map((item) => item.text));
  expect(await page.locator("#ganzhi-relations .relation-row-label").allTextContents())
    .toEqual(["天干留意", "地支留意"]);
  expect(await page.locator("#ganzhi-relations h4").count()).toBe(0);
  expect(await page.locator("#ganzhi-relations .relation-tag").evaluateAll((tags) =>
    tags.every((tag) => getComputedStyle(tag).whiteSpace === "nowrap")
  )).toBe(true);

  const wrapped = await page.locator("#ganzhi-relations .relation-tag-list").evaluateAll((lists) =>
    lists.some((list) => new Set(Array.from(list.children, (tag) => (tag as HTMLElement).offsetTop)).size > 1)
  );
  if (shouldWrap) expect(wrapped).toBe(true);
  const noPageOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  );
  expect(noPageOverflow).toBe(true);
  await page.close();
}

describe("E2E - 大运流年卡片密度", () => {
  it("桌面完整显示十张，窄屏至少完整显示四张", async () => {
    const cases = [
      { viewport: { width: 1280, height: 900 }, minimumVisibleCards: 10, allCardsFit: true },
      { viewport: { width: 375, height: 812 }, minimumVisibleCards: 4, allCardsFit: false },
    ];

    for (const testCase of cases) {
      const page = await newPage(testCase.viewport);
      await page.click('button[type="submit"]');
      await page.waitForSelector("#dayun-grid .dayun-card", { timeout: 5000 });

      for (const selector of ["#dayun-grid", "#liunian-grid"]) {
        const layout = await page.locator(selector).evaluate((element) => {
          const gridRect = element.getBoundingClientRect();
          const cards = Array.from(element.querySelectorAll(".zhu-card"));
          return {
            cardCount: cards.length,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            fullyVisibleCards: cards.filter((card) => {
              const cardRect = card.getBoundingClientRect();
              return cardRect.left >= gridRect.left && cardRect.right <= gridRect.right + 0.5;
            }).length,
          };
        });
        expect(layout.cardCount).toBe(10);
        expect(layout.fullyVisibleCards).toBeGreaterThanOrEqual(testCase.minimumVisibleCards);
        if (testCase.allCardsFit) {
          expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
        }
      }

      expect(await page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )).toBe(true);
      await page.close();
    }
  }, 20_000);
});

describe("E2E - 桌面 viewport (1280x900)", () => {
  it("个人栏位于四柱前并展示 API 返回的生肖与星座", async () => {
    await expectPersonalInfo({ width: 1280, height: 900 });
  });

  it("干支留意真实非空、空状态与密集 API 顺序", async () => {
    await expectRealGanzhiRelations({ width: 1280, height: 900 });
    await expectDenseGanzhiRelations({ width: 1280, height: 900 }, false);
  }, 20_000);

  it("命盘链接恢复基础出生资料但不自动排盘", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    let paipanRequests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/paipan") && request.method() === "POST") {
        paipanRequests += 1;
      }
    });

    await page.goto(baseUrl + "/?date=1990-05-15&time=08%3A30&gender=" + encodeURIComponent("女"));
    await page.waitForLoadState("networkidle");

    expect(await page.inputValue("#date")).toBe("1990-05-15");
    expect(await page.inputValue("#time")).toBe("08:30");
    expect(await page.inputValue("#gender")).toBe("女");
    expect(paipanRequests).toBe(0);
    expect(await page.isVisible("#empty-state")).toBe(true);

    await page.close();
  });

  it("首页使用统一的出生资料默认值", async () => {
    const page = await newPage({ width: 1280, height: 900 });

    expect(await page.inputValue("#date")).toBe("2000-01-01");
    expect(await page.inputValue("#time")).toBe("00:00");
    expect(await page.inputValue("#gender")).toBe("男");
    await expectCityUnselected(page);

    await page.close();
  });

  it("命盘链接等待城市数据后恢复完整出生地", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const query = new URLSearchParams({
      date: "1990-05-15",
      province: "四川省",
      city: "绵阳市",
    });

    await page.goto(baseUrl + "/?" + query.toString());
    await page.waitForLoadState("networkidle");

    expect(await page.inputValue("#province")).toBe("四川省");
    expect(await page.isEnabled("#city")).toBe(true);
    expect(await page.inputValue("#city")).toBe("绵阳市");

    await page.close();
  });

  it("命盘链接恢复出生地期间阻止提前排盘", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    var releaseCityRequest = function () {};
    var cityRequestReleased = new Promise(function (resolve) { releaseCityRequest = resolve; });
    var markCityRequestStarted = function () {};
    var cityRequestStarted = new Promise(function (resolve) { markCityRequestStarted = resolve; });
    await page.route("**/cities/*", async function (route) {
      var pathname = decodeURIComponent(new URL(route.request().url()).pathname);
      if (!pathname.endsWith("/cities/四川省.json")) {
        await route.continue();
        return;
      }
      markCityRequestStarted();
      await cityRequestReleased;
      await route.continue();
    });

    const query = new URLSearchParams({
      date: "1990-05-15",
      province: "四川省",
      city: "绵阳市",
    });
    await page.goto(baseUrl + "/?" + query.toString());
    await cityRequestStarted;

    expect(await page.isDisabled("#province")).toBe(true);
    expect(await page.isDisabled('button[type="submit"]')).toBe(true);

    releaseCityRequest();
    await page.waitForLoadState("networkidle");
    expect(await page.isEnabled("#province")).toBe(true);
    expect(await page.isEnabled('button[type="submit"]')).toBe(true);
    expect(await page.inputValue("#city")).toBe("绵阳市");

    await page.close();
  });

  it("重复基础参数采用最后一个值并将非法值静默兜底", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const url = baseUrl
      + "/?date=1990-05-15&date=9999-12-31"
      + "&time=08%3A30&time=24%3A01"
      + "&gender=" + encodeURIComponent("女")
      + "&gender=unknown";

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(await page.inputValue("#date")).toBe("2000-01-01");
    expect(await page.inputValue("#time")).toBe("00:00");
    expect(await page.inputValue("#gender")).toBe("男");
    expect(new URL(page.url()).searchParams.getAll("date")).toEqual(["1990-05-15", "9999-12-31"]);

    await page.close();
  });

  it("命盘链接按北京日期精确执行未来一百年边界", async () => {
    const fixedNowMs = Date.UTC(2026, 6, 22, 0, 0, 0);
    const scenarios = [
      { queryDate: "2126-07-22", expectedDate: "2126-07-22" },
      { queryDate: "2126-07-23", expectedDate: "2000-01-01" },
    ];

    for (const scenario of scenarios) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.addInitScript((nowMs) => {
        Date.now = () => nowMs;
      }, fixedNowMs);
      await page.goto(baseUrl + "/?date=" + scenario.queryDate);
      await page.waitForLoadState("networkidle");

      expect(await page.inputValue("#date")).toBe(scenario.expectedDate);
      await page.close();
    }
  });

  it("命盘链接参数名区分大小写", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(baseUrl + "/?Date=1990-05-15&Time=08%3A30&Gender=" + encodeURIComponent("女"));
    await page.waitForLoadState("networkidle");

    expect(await page.inputValue("#date")).toBe("2000-01-01");
    expect(await page.inputValue("#time")).toBe("00:00");
    expect(await page.inputValue("#gender")).toBe("男");

    await page.close();
  });

  it("命盘链接中的出生地非法或不成对时整体兜底", async () => {
    const scenarios = [
      { province: "四川省", city: "不存在的市" },
      { province: "四川省" },
      { city: "绵阳市" },
      { province: "不存在的省", city: "绵阳市" },
    ];

    for (const birthplace of scenarios) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const query = new URLSearchParams({ date: "1990-05-15", ...birthplace });
      await page.goto(baseUrl + "/?" + query.toString());
      await page.waitForLoadState("networkidle");

      expect(await page.inputValue("#province")).toBe("");
      await expectCityUnselected(page);
      await page.close();
    }
  });

  it("排盘成功后规范化命盘链接且不新增历史项", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const url = baseUrl
      + "/?source=campaign"
      + "&date=1980-01-01&date=1990-05-15"
      + "&time=08%3A30"
      + "&gender=" + encodeURIComponent("女")
      + "&province=" + encodeURIComponent("四川省")
      + "&city=" + encodeURIComponent("绵阳市")
      + "#details";
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const historyLengthBefore = await page.evaluate(() => window.history.length);
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/paipan") && response.request().method() === "POST",
    );

    await page.click('button[type="submit"]');
    expect((await responsePromise).ok()).toBe(true);
    await page.waitForSelector("#result-sizhu:not([hidden])");

    const normalizedUrl = new URL(page.url());
    expect(normalizedUrl.searchParams.get("source")).toBe("campaign");
    expect(normalizedUrl.searchParams.getAll("date")).toEqual(["1990-05-15"]);
    expect(normalizedUrl.searchParams.getAll("time")).toEqual(["08:30"]);
    expect(normalizedUrl.searchParams.getAll("gender")).toEqual(["女"]);
    expect(normalizedUrl.searchParams.getAll("province")).toEqual(["四川省"]);
    expect(normalizedUrl.searchParams.getAll("city")).toEqual(["绵阳市"]);
    expect(normalizedUrl.hash).toBe("#details");
    expect(await page.evaluate(() => window.history.length)).toBe(historyLengthBefore);

    await page.close();
  });

  it("按默认出生资料排盘成功后移除无效出生地参数", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(baseUrl + "/?source=campaign&date=invalid&province=" + encodeURIComponent("四川省"));
    await page.waitForLoadState("networkidle");

    await page.click('button[type="submit"]');
    await page.waitForSelector("#result-sizhu:not([hidden])");

    const normalizedUrl = new URL(page.url());
    expect(normalizedUrl.searchParams.get("source")).toBe("campaign");
    expect(normalizedUrl.searchParams.get("date")).toBe("2000-01-01");
    expect(normalizedUrl.searchParams.get("time")).toBe("00:00");
    expect(normalizedUrl.searchParams.get("gender")).toBe("男");
    expect(normalizedUrl.searchParams.has("province")).toBe(false);
    expect(normalizedUrl.searchParams.has("city")).toBe(false);

    await page.close();
  });

  it("排盘失败时保持命盘链接不变", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(baseUrl + "/?source=campaign&date=1990-05-15");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => { document.getElementById("date")!.value = ""; });
    const urlBefore = page.url();
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/paipan") && response.request().method() === "POST",
    );

    await page.click('button[type="submit"]');
    expect((await responsePromise).status()).toBe(400);

    expect(page.url()).toBe(urlBefore);
    expect(await page.isVisible("#general-error:not([hidden])")).toBe(true);

    await page.close();
  });

  it("默认成功排盘显示四柱/大运/流年", async () => {
    const page = await newPage({ width: 1280, height: 900 });
    await page.click('button[type="submit"]');
    await page.waitForSelector("#result-sizhu:not([hidden])", { timeout: 5000 });

    const sizhuLabels = await page.$$eval("#sizhu-grid .sizhu-column-label", els =>
      els.map(e => e.textContent)
    );
    expect(sizhuLabels).toEqual(["年柱", "月柱", "日柱", "时柱"]);

    const rowLabels = await page.$$eval("#sizhu-grid .sizhu-row-label", els =>
      els.map(e => e.textContent)
    );
    expect(rowLabels).toEqual(["日期", "主星", "天干", "地支", "藏干", "副星"]);
    expect(await page.locator("#sizhu-grid .sizhu-canggan").first().textContent()).toContain("乙");
    expect(await page.locator("#sizhu-grid .sizhu-fuxing").first().textContent()).toContain("正官");

    expect(await page.locator("#result-tips").count()).toBe(0);
    expect(await page.locator("#dayun-grid .zhu-card").count()).toBe(10);
    expect(await page.locator("#liunian-grid .zhu-card").count()).toBe(10);
    expect(await page.locator("#dayun-grid .zhu-card.is-selected").count()).toBe(1);

    const selectedStartYear = Number(await page.locator("#dayun-grid .zhu-card.is-selected").getAttribute("data-start-year"));
    const visibleYears = await page.locator("#liunian-grid .zhu-year").evaluateAll((els) =>
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

    const selectedIndex = await page.locator("#dayun-grid .zhu-card.is-selected").getAttribute("data-index");
    expect(selectedIndex).toBe("0");
    expect(await page.locator("#dayun-grid .current-dayun-badge").count()).toBe(0);
    const firstStartYear = Number(await page.locator("#dayun-grid .zhu-card").first().getAttribute("data-start-year"));
    const visibleYears = await page.locator("#liunian-grid .zhu-year").evaluateAll((els) =>
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
      expect(await page.locator("#liunian-grid .zhu-year").first().evaluate((el) => el.firstChild!.textContent!.trim())).toBe(String(startYear));
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
    await selectBeijingBirthplace(page);
    await page.fill("#time", "12:00");
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/paipan") && response.request().method() === "POST",
    );
    await page.click('button[type="submit"]');
    const responseData = (await (await responsePromise).json()).data;
    await page.waitForSelector("#dayun-grid .dayun-card", { timeout: 5000 });

    const firstDayun = page.locator("#dayun-grid .dayun-card").first();
    expect(await firstDayun.locator(":scope > .zhu-year").textContent()).toMatch(/^\d{4}$/);
    expect(await firstDayun.locator(":scope > .zhu-age").textContent()).toBe("8~17岁");
    expect(await page.locator("#dayun-info").textContent()).toBe("方向：逆行；起运 8岁0月");
    expect(await page.locator("#dayun-grid").textContent()).not.toMatch(/\d+月/);
    expect(await firstDayun.textContent()).not.toMatch(/第\s*\d+|起运：|藏干|副星|\d{4}年\d+月/);
    expect(await firstDayun.locator(".zhu-row").count()).toBe(2);

    expect(await page.locator("#liunian-grid button").count()).toBe(0);
    expect(await page.locator("#liunian-grid .liunian-card").count()).toBe(10);
    expect(await page.locator("#liunian-grid .liunian-card .zhu-row").count()).toBe(20);
    expect(await page.locator("#liunian-grid .current-year-badge").count()).toBe(1);

    const abbreviationByShishen = {
      "比肩": "比", "劫财": "劫", "食神": "食", "伤官": "伤", "偏财": "才",
      "正财": "财", "七杀": "杀", "正官": "官", "偏印": "枭", "正印": "印",
    };
    const abbreviations = await page.locator("#dayun-grid .zhu-shishen-short, #liunian-grid .zhu-shishen-short").allTextContents();
    const selectedDayun = responseData.dayun.zhu.find((zhu) => zhu.isCurrent) ?? responseData.dayun.zhu[0];
    const expectedAbbreviations = [
      ...responseData.dayun.zhu.flatMap((zhu) => [abbreviationByShishen[zhu.tianganShishen], abbreviationByShishen[zhu.dizhiShishen]]),
      ...selectedDayun.liunian.flatMap((item) => [abbreviationByShishen[item.tianganShishen], abbreviationByShishen[item.dizhiShishen]]),
    ];
    expect(abbreviations).toEqual(expectedAbbreviations);

    const rowOrder = await page.locator("#dayun-grid .zhu-row, #liunian-grid .zhu-row").evaluateAll((rows) => rows.map((row) => ({
      classes: Array.from(row.children, (child) => child.className),
      flexDirection: getComputedStyle(row).flexDirection,
    })));
    expect(rowOrder.every((row) => row.flexDirection === "row" && row.classes[0] === "zhu-character" && row.classes[1] === "zhu-shishen-short")).toBe(true);

    const styles = await page.locator("#dayun-grid .zhu-row").first().evaluate((row) => {
      const character = getComputedStyle(row.querySelector(".zhu-character")!);
      const shishen = getComputedStyle(row.querySelector(".zhu-shishen-short")!);
      return { characterSize: parseFloat(character.fontSize), shishenSize: parseFloat(shishen.fontSize), shishenColor: shishen.color };
    });
    expect(styles.shishenSize).toBeLessThan(styles.characterSize);
    const colors = await page.locator(".zhu-shishen-short").evaluateAll((els) => [...new Set(els.map((el) => getComputedStyle(el).color))]);
    expect(colors).toEqual([styles.shishenColor]);

    await page.close();
  });

  it("省市默认状态、联动与清空", async () => {
    const page = await newPage({ width: 1280, height: 900 });

    // 默认不选出生地，按钟表时排盘
    expect(await page.inputValue("#province")).toBe("");
    expect(await page.locator('#province option[value=""]').textContent()).toBe("不选（按北京时间）");
    await expectCityUnselected(page);

    // 切到四川省 -> 城市重新加载
    await page.selectOption("#province", "四川省");
    await page.waitForTimeout(500);
    const sichuanCities = await page.locator("#city option").count();
    expect(sichuanCities).toBeGreaterThan(1);

    // 清空省份 -> 城市禁用，两者均空
    await page.selectOption("#province", "");
    await page.waitForTimeout(300);
    expect(await page.inputValue("#province")).toBe("");
    await expectCityUnselected(page);

    await page.close();
  });

  it("清空省份后忽略尚未完成的城市请求", async () => {
    const page = await newPage({ width: 1280, height: 900 });
    var releaseCityRequest = function () {};
    var cityRequestReleased = new Promise(function (resolve) { releaseCityRequest = resolve; });
    var markCityRequestStarted = function () {};
    var cityRequestStarted = new Promise(function (resolve) { markCityRequestStarted = resolve; });

    await page.route("**/cities/*", async function (route) {
      var pathname = decodeURIComponent(new URL(route.request().url()).pathname);
      if (!pathname.endsWith("/cities/四川省.json")) {
        await route.continue();
        return;
      }
      markCityRequestStarted();
      await cityRequestReleased;
      await route.continue();
    });

    await page.selectOption("#province", "四川省");
    await cityRequestStarted;
    await page.selectOption("#province", "");
    var responsePromise = page.waitForResponse(function (response) {
      return decodeURIComponent(new URL(response.url()).pathname).endsWith("/cities/四川省.json");
    });
    releaseCityRequest();
    await responsePromise;
    await page.waitForTimeout(50);

    await expectCityUnselected(page);

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
  it("个人栏在窄屏保持两列且无横向溢出", async () => {
    await expectPersonalInfo({ width: 375, height: 812 });
  });

  it("干支留意保留双行结构、密集标签整项换行且无横向溢出", async () => {
    await expectRealGanzhiRelations({ width: 375, height: 812 });
    await expectDenseGanzhiRelations({ width: 375, height: 812 }, true);
  }, 20_000);

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
    await selectBeijingBirthplace(page);
    await page.fill("#time", "12:00");
    await page.click('button[type="submit"]');
    await page.waitForSelector("#dayun-grid .dayun-card", { timeout: 5000 });

    const buttons = page.locator("#dayun-grid .dayun-card");
    expect(await buttons.count()).toBe(10);
    expect(await page.locator("#liunian-grid .liunian-card").count()).toBe(10);
    expect(await buttons.first().locator(":scope > .zhu-year").textContent()).toMatch(/^\d{4}$/);
    expect(await buttons.first().locator(":scope > .zhu-age").textContent()).toBe("8~17岁");
    expect(await buttons.first().locator(".zhu-row").count()).toBe(2);
    expect(await page.locator("#liunian-grid .liunian-card .zhu-row").count()).toBe(20);
    const narrowAbbreviations = await page.locator("#dayun-grid .zhu-shishen-short, #liunian-grid .zhu-shishen-short").allTextContents();
    expect(narrowAbbreviations).toHaveLength(40);
    expect(narrowAbbreviations.every((value) => ["比", "劫", "食", "伤", "才", "财", "杀", "官", "枭", "印"].includes(value))).toBe(true);

    async function expectNarrowSelection(index: number) {
      const button = buttons.nth(index);
      const startYear = await button.getAttribute("data-start-year");
      expect(await button.getAttribute("aria-pressed")).toBe("true");
      expect(await page.locator("#liunian-grid .zhu-year").first().evaluate((el) => el.firstChild!.textContent!.trim())).toBe(startYear);
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
