import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const yuanRoot = "/books/yuanhaiziping";
const sanmingRoot = "/books/sanmingtonghui";
const wudengRoot = "/books/wudenghuiyuan";
const volumeChunk = /\/assets\/v\d+-[^/]+\.js$/;
const sanmingCounts = [36, 26, 23, 25, 20, 73, 22, 60, 60, 3, 5, 17];
const wudengCounts = [
  40, 62, 72, 76, 44, 105, 46, 131, 45, 105,
  50, 98, 70, 123, 171, 137, 68, 118, 56, 122,
];

async function expectNoSeriousA11y(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")),
  ).toEqual([]);
}

test("典籍首页按固定顺序展示三部典籍且顶部入口正确", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  await page.goto("/books");

  await expect(page.getByRole("heading", { level: 1, name: "典籍" })).toBeVisible();
  const cards = page.locator(".book-card-grid > a");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("渊海子平");
  await expect(cards.nth(0)).toContainText("5 卷 · 269 篇");
  await expect(cards.nth(1)).toContainText("三命通会");
  await expect(cards.nth(1)).toContainText("12 卷 · 370 篇");
  await expect(cards.nth(2)).toContainText("五灯会元");
  await expect(cards.nth(2)).toContainText("20 卷 · 1739 篇");
  await expect(page.getByRole("navigation", { name: "一级导航" }).getByRole("link", { name: "典籍" }))
    .toHaveAttribute("aria-current", "page");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);
});

test("《五灯会元》二十卷首页与每卷首末篇均可直达", async ({ page }) => {
  test.setTimeout(180_000);
  for (let offset = 0; offset < wudengCounts.length; offset += 1) {
    const volumeNumber = offset + 1;
    const volumeId = `v${volumeNumber}`;
    const first = `${volumeId}-c001`;
    const last = `${volumeId}-c${String(wudengCounts[offset]).padStart(3, "0")}`;
    await page.goto(`${wudengRoot}/volumes/${volumeId}`);
    await expect(page.locator(".volume-home")).toContainText(`${wudengCounts[offset]} 篇`);
    for (const chapterId of [first, last]) {
      await page.goto(`${wudengRoot}/chapters/${chapterId}`);
      await expect(page.locator(".chapter-article")).toBeVisible();
      await expect(page.locator(".chapter-heading h1")).not.toBeEmpty();
      await page.reload();
      await expect(page.locator(".chapter-article")).toBeVisible();
    }
  }
});

test("《五灯会元》十九个跨卷边界及全书首尾严格连续", async ({ page }) => {
  test.setTimeout(120_000);
  for (let offset = 0; offset < wudengCounts.length - 1; offset += 1) {
    const currentVolume = offset + 1;
    const current = `v${currentVolume}-c${String(wudengCounts[offset]).padStart(3, "0")}`;
    const next = `v${currentVolume + 1}-c001`;
    await page.goto(`${wudengRoot}/chapters/${current}`);
    await page.getByRole("link", { name: /下一篇/ }).click();
    await expect(page).toHaveURL(new RegExp(`${next}$`));
  }
  await page.goto(`${wudengRoot}/chapters/v1-c001`);
  await expect(page.locator(".chapter-neighbors .is-unavailable").first()).toContainText("全书之始");
  await page.goto(`${wudengRoot}/chapters/v20-c122`);
  await expect(page.locator(".chapter-neighbors .is-unavailable").last()).toContainText("全书之末");
});

test("《三命通会》十二卷首页与每卷首末篇均可直达", async ({ page }) => {
  test.setTimeout(120_000);
  for (let offset = 0; offset < sanmingCounts.length; offset += 1) {
    const volumeNumber = offset + 1;
    const volumeId = `v${volumeNumber}`;
    const first = `${volumeId}-c001`;
    const last = `${volumeId}-c${String(sanmingCounts[offset]).padStart(3, "0")}`;
    await page.goto(`${sanmingRoot}/volumes/${volumeId}`);
    await expect(page.locator(".volume-home")).toContainText(`${sanmingCounts[offset]} 篇`);
    for (const chapterId of [first, last]) {
      await page.goto(`${sanmingRoot}/chapters/${chapterId}`);
      await expect(page.locator(".chapter-article")).toBeVisible();
      await expect(page.locator(".chapter-heading h1")).not.toBeEmpty();
      await page.reload();
      await expect(page.locator(".chapter-article")).toBeVisible();
    }
  }
});

test("《三命通会》十一个跨卷边界及全书首尾严格连续", async ({ page }) => {
  for (let offset = 0; offset < sanmingCounts.length - 1; offset += 1) {
    const currentVolume = offset + 1;
    const current = `v${currentVolume}-c${String(sanmingCounts[offset]).padStart(3, "0")}`;
    const next = `v${currentVolume + 1}-c001`;
    await page.goto(`${sanmingRoot}/chapters/${current}`);
    await page.getByRole("link", { name: /下一篇/ }).click();
    await expect(page).toHaveURL(new RegExp(`${next}$`));
  }
  await page.goto(`${sanmingRoot}/chapters/v1-c001`);
  await expect(page.locator(".chapter-neighbors .is-unavailable").first()).toContainText("全书之始");
  await page.goto(`${sanmingRoot}/chapters/v12-c017`);
  await expect(page.locator(".chapter-neighbors .is-unavailable").last()).toContainText("全书之末");
});

test("《渊海子平》既有首页、深链、同卷与跨卷行为保持不变", async ({ page }) => {
  await page.goto(yuanRoot);
  await expect(page.getByRole("heading", { level: 1, name: "渊海子平" })).toBeVisible();
  await page.goto(`${yuanRoot}/chapters/v1-c001`);
  await expect(page.getByRole("heading", { level: 1, name: "论五行所生之始" })).toBeVisible();
  await page.getByRole("link", { name: /下一篇.*论天干地支所出/ }).click();
  await expect(page).toHaveURL(/v1-c002$/);
  await page.goto(`${yuanRoot}/chapters/v1-c069`);
  await page.getByRole("link", { name: /下一篇.*继善篇/ }).click();
  await expect(page).toHaveURL(/v2-c001$/);
});

test("canonical 与两层 Not Found 保留查询、fragment 和原地址", async ({ page }) => {
  await page.goto("/books/?from=test#top");
  await expect(page).toHaveURL("/books?from=test#top");
  await page.goto(`${sanmingRoot}/chapters/v1-c001/?from=test#body`);
  await expect(page).toHaveURL(`${sanmingRoot}/chapters/v1-c001?from=test#body`);

  await page.goto("/books/unknown");
  await expect(page.getByRole("link", { name: "返回典籍首页" })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/books/unknown");

  for (const invalid of [
    `${sanmingRoot}/chapters/v1_c001`,
    `${sanmingRoot}/chapters/UNKNOWN`,
    `${sanmingRoot}/volumes/v13`,
    `${sanmingRoot}/chapters`,
  ]) {
    await page.goto(invalid);
    await expect(page.getByRole("heading", { name: "此页不存在" })).toBeVisible();
    await expect(page.getByRole("link", { name: /返回《三命通会》首页/ })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(invalid);
  }
});

test("正文请求只加载当前卷，同卷零新增，跨卷 focus 最多新增一个", async ({ page }) => {
  test.setTimeout(60_000);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  await page.goto("/");
  expect(requests.some((request) => request.includes("BooksRoutes") || volumeChunk.test(request))).toBe(false);

  requests.length = 0;
  await page.goto("/books");
  await page.goto(sanmingRoot);
  await page.goto(`${sanmingRoot}/volumes/v1`);
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);

  requests.length = 0;
  await page.goto(`${sanmingRoot}/chapters/v1-c001`);
  await expect(page.locator(".chapter-prose")).toContainText("天高寥廓");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);
  await page.getByRole("link", { name: /下一篇.*论五行生克/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "论五行生克" })).toBeVisible();
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);

  await page.goto(`${sanmingRoot}/chapters/v1-c036`);
  await expect(page.getByRole("heading", { level: 1, name: "壬戌癸亥大海水" })).toBeVisible();
  await expect(page.locator(".chapter-prose")).not.toBeEmpty();
  const beforePrefetch = requests.filter((request) => volumeChunk.test(request)).length;
  await page.getByRole("link", { name: /下一篇.*论天干阴阳生死/ }).focus();
  await expect.poll(() => requests.filter((request) => volumeChunk.test(request)).length)
    .toBe(beforePrefetch + 1);
  await page.getByRole("link", { name: /下一篇.*论天干阴阳生死/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "论天干阴阳生死" })).toBeVisible();
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(beforePrefetch + 1);

  await page.goto(`${sanmingRoot}/chapters/v2-c026`);
  await expect(page.locator(".chapter-prose")).not.toBeEmpty();
  const beforeHoverPrefetch = requests.filter((request) => volumeChunk.test(request)).length;
  await page.getByRole("link", { name: /下一篇/ }).hover();
  await expect.poll(() => requests.filter((request) => volumeChunk.test(request)).length)
    .toBe(beforeHoverPrefetch + 1);
  await page.getByRole("link", { name: /下一篇/ }).click();
  await expect(page).toHaveURL(/\/chapters\/v3-c001$/);
  await expect(page.locator(".chapter-prose")).not.toBeEmpty();
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(beforeHoverPrefetch + 1);
});

test("《五灯会元》典籍首页不加载正文，篇章直达与跨卷预取遵守共享请求契约", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  await page.goto(wudengRoot);
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);

  requests.length = 0;
  await page.goto(`${wudengRoot}/chapters/v1-c001`);
  await expect(page.locator(".chapter-prose")).toContainText("七佛古佛应世");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);
  await page.getByRole("link", { name: /下一篇/ }).click();
  await expect(page).toHaveURL(/\/chapters\/v1-c002$/);
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);

  await page.goto(`${wudengRoot}/chapters/v1-c040`);
  const beforePrefetch = new Set(requests.filter((request) => volumeChunk.test(request)));
  await page.getByRole("link", { name: /下一篇/ }).focus();
  await expect.poll(() =>
    new Set(requests.filter((request) => volumeChunk.test(request))).size,
  ).toBe(beforePrefetch.size + 1);
  const afterPrefetch = new Set(requests.filter((request) => volumeChunk.test(request)));
  const prefetchedChunks = [...afterPrefetch].filter((request) => !beforePrefetch.has(request));
  expect(prefetchedChunks, `跨卷 focus 新增正文 chunk：${prefetchedChunks.join(", ")}`).toHaveLength(1);
  await page.getByRole("link", { name: /下一篇/ }).click();
  await expect(page).toHaveURL(/\/chapters\/v2-c001$/);
  expect(new Set(requests.filter((request) => volumeChunk.test(request))))
    .toEqual(afterPrefetch);
});

test("正文加载失败保留框架、身份与导航，重试只恢复当前卷", async ({ page }) => {
  let attempts = 0;
  let documentRequests = 0;
  page.on("request", (request) => {
    if (request.resourceType() === "document") documentRequests += 1;
  });
  await page.route(/\/assets\/v1-[^/]+\.js(?:\?.*)?$/, async (route) => {
    attempts += 1;
    if (attempts === 1) await route.abort();
    else await route.continue();
  });
  await page.goto(`${sanmingRoot}/chapters/v1-c001`);
  await expect(page.getByRole("heading", { level: 1, name: "论五行生成" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("本卷正文载入失败");
  await expect(page.getByRole("navigation", { name: "相邻篇章" })).toBeVisible();
  await expectNoSeriousA11y(page);
  const documentRequestsBeforeRetry = documentRequests;
  await page.getByRole("button", { name: "重试当前卷" }).click();
  await expect(page.locator(".chapter-prose")).toContainText("天高寥廓");
  expect(attempts).toBeGreaterThanOrEqual(2);
  expect(documentRequests).toBe(documentRequestsBeforeRetry);
});

test("代表页面与共享错误状态无 serious/critical 可访问性违规", async ({ page }) => {
  for (const path of [
    "/books",
    yuanRoot,
    `${yuanRoot}/volumes/v1`,
    `${yuanRoot}/chapters/v1-c046`,
    sanmingRoot,
    `${sanmingRoot}/volumes/v10`,
    `${sanmingRoot}/chapters/v10-c001`,
    wudengRoot,
    `${wudengRoot}/volumes/v3`,
    `${wudengRoot}/chapters/v3-c001`,
    "/books/missing",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoSeriousA11y(page);
  }
});
