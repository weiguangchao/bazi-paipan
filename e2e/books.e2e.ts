import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const yuanRoot = "/books/yuanhaiziping";
const sanmingRoot = "/books/sanmingtonghui";
const wudengRoot = "/books/wudenghuiyuan";
const xinjingRoot = "/books/xinjing";
const qiongtongRoot = "/books/qiongtongbaojian";
const jingangRoot = "/books/jingangjing";
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

test("典籍首页按固定顺序展示六部典籍且顶部入口正确", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  await page.goto("/books");

  await expect(page.getByRole("heading", { level: 1, name: "典籍" })).toBeVisible();
  const cards = page.locator(".book-card-grid > a");
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(0)).toContainText("渊海子平");
  await expect(cards.nth(0)).toContainText("5 卷 · 269 篇");
  await expect(cards.nth(1)).toContainText("三命通会");
  await expect(cards.nth(1)).toContainText("12 卷 · 370 篇");
  await expect(cards.nth(2)).toContainText("五灯会元");
  await expect(cards.nth(2)).toContainText("20 卷 · 1739 篇");
  await expect(cards.nth(3)).toContainText("般若波罗蜜多心经");
  await expect(cards.nth(3)).toContainText("唐三藏法师玄奘 译");
  await expect(cards.nth(3)).toContainText("1 卷 · 1 篇");
  await expect(cards.nth(4)).toContainText("穷通宝鉴");
  await expect(cards.nth(4)).toContainText("（清）余春台 辑 · 徐乐吾 评注");
  await expect(cards.nth(4)).toContainText("1 卷 · 108 篇");
  await expect(cards.nth(5)).toContainText("金刚般若波罗蜜经");
  await expect(cards.nth(5)).toContainText("姚秦三藏法师鸠摩罗什 译");
  await expect(cards.nth(5)).toContainText("1 卷 · 33 篇");
  await expect(page.getByRole("navigation", { name: "一级导航" }).getByRole("link", { name: "典籍" }))
    .toHaveAttribute("aria-current", "page");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);
});

test("《金刚般若波罗蜜经》33 篇共享阅读、保真、导航与单卷请求契约", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));

  await page.goto(jingangRoot);
  await expect(page.getByRole("heading", {
    level: 1,
    name: "金刚般若波罗蜜经",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "姚秦三藏法师鸠摩罗什 译",
  })).toBeVisible();
  await expect(page.locator(".book-hero")).toContainText("典籍 · 1 卷 · 33 篇");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);

  await page.goto(`${jingangRoot}/volumes/v1`);
  await expect(page.getByRole("heading", { level: 1, name: "全卷" })).toBeVisible();
  await expect(page.locator(".volume-home ol").getByRole("link")).toHaveCount(33);
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);

  requests.length = 0;
  await page.goto(`${jingangRoot}/chapters/v1-c001`);
  await expect(page.getByRole("heading", { level: 1, name: "开经偈" })).toBeVisible();
  await expect(page.locator(".chapter-heading")).toContainText("姚秦三藏法师鸠摩罗什 译");
  await expect(page.locator(".chapter-prose")).toContainText("无上甚深微妙法　百千万劫难遭遇");
  await expect(page.locator(".chapter-neighbors .is-unavailable").first()).toContainText("全书之始");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);

  const next = page.getByRole("link", { name: /下一篇.*法会因由分第一/ });
  await next.focus();
  await next.hover();
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);
  await next.click();
  await expect(page.getByRole("heading", { level: 1, name: "法会因由分第一" })).toBeVisible();
  await expect(page.locator(".chapter-prose")).toContainText("如是我闻。一时");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);

  await page.goto(`${jingangRoot}/chapters/v1-c015`);
  await expect(page.getByRole("heading", { level: 1, name: "离相寂灭分第十四" })).toBeVisible();
  await expect(page.locator(".chapter-prose")).toContainText("如来是真语者、实语者、如语者");

  await page.goto(`${jingangRoot}/chapters/v1-c033`);
  await expect(page.getByRole("heading", { level: 1, name: "应化非真分第三十二" })).toBeVisible();
  await expect(page.locator(".chapter-prose")).toContainText("一切有为法，如梦幻泡影");
  await expect(page.locator(".chapter-neighbors .is-unavailable").last()).toContainText("全书之末");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "应化非真分第三十二" })).toBeVisible();
  await expectNoSeriousA11y(page);
});

test("《金刚般若波罗蜜经》正文加载失败后由共享重试恢复当前单卷", async ({ page }) => {
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

  await page.goto(`${jingangRoot}/chapters/v1-c015`);
  await expect(page.getByRole("heading", { level: 1, name: "离相寂灭分第十四" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("本卷正文载入失败");
  const documentRequestsBeforeRetry = documentRequests;
  await page.getByRole("button", { name: "重试当前卷" }).click();
  await expect(page.locator(".chapter-prose")).toContainText("如来是真语者、实语者、如语者");
  expect(attempts).toBeGreaterThanOrEqual(2);
  expect(documentRequests).toBe(documentRequestsBeforeRetry);
});

test("《穷通宝鉴》108 篇共享阅读体验、保真结构与单卷请求契约", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));

  await page.goto(qiongtongRoot);
  await expect(page.getByRole("heading", { level: 1, name: "穷通宝鉴" })).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "（清）余春台 辑 · 徐乐吾 评注",
  })).toBeVisible();
  await expect(page.locator(".book-hero")).toContainText("典籍 · 1 卷 · 108 篇");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);

  await page.goto(`${qiongtongRoot}/volumes/v1`);
  await expect(page.getByRole("heading", { level: 1, name: "全卷" })).toBeVisible();
  await expect(page.locator(".volume-home")).toContainText("108 篇");
  await expect(page.locator(".volume-home ol").getByRole("link")).toHaveCount(108);
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);

  requests.length = 0;
  await page.goto(`${qiongtongRoot}/chapters/v1-c005`);
  await expect(page.getByRole("heading", { level: 1, name: "三春甲木" })).toBeVisible();
  await expect(page.locator(".chapter-heading")).toContainText(
    "（清）余春台 辑 · 徐乐吾 评注",
  );
  await expect(page.locator(".chapter-prose blockquote")).toContainText("徐乐吾评注");
  await expect(page.getByRole("table")).toBeVisible();
  const loadedChunks = requests.filter((request) => volumeChunk.test(request));
  expect(loadedChunks).toHaveLength(1);

  const next = page.getByRole("link", { name: /下一篇.*三夏甲木/ });
  await expect(page.locator(".reader-directory")).toBeVisible();
  await next.focus();
  await next.hover();
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);
  await next.click();
  await expect(page.getByRole("heading", { level: 1, name: "三夏甲木" })).toBeVisible();
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);

  await page.goto(`${qiongtongRoot}/chapters/v1-c034`);
  await expect(page.getByRole("heading", { level: 1, name: "四月丁火" })).toBeVisible();
  await expect(page.locator(".chapter-prose")).toContainText("三夏丁火");
  await expect(page.locator(".chapter-prose")).toContainText("四月丁火");

  await page.goto(`${qiongtongRoot}/chapters/v1-c008`);
  await expect(page.locator(".chapter-prose")).toContainText("三秋甲木");
  await expect(page.locator(".chapter-prose")).not.toBeEmpty();

  await page.goto(`${qiongtongRoot}/chapters/v1-c001`);
  await expect(page.locator(".chapter-neighbors .is-unavailable").first()).toContainText("全书之始");
  await page.goto(`${qiongtongRoot}/chapters/v1-c108`);
  await expect(page.getByRole("heading", { level: 1, name: "十二月癸水" })).toBeVisible();
  await expect(page.locator(".chapter-prose")).toContainText("【徐乐吾评注】");
  await expect(page.locator(".chapter-neighbors .is-unavailable").last()).toContainText("全书之末");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "十二月癸水" })).toBeVisible();
  await expectNoSeriousA11y(page);
});

test("《穷通宝鉴》正文加载失败后由共享重试恢复当前单卷", async ({ page }) => {
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

  await page.goto(`${qiongtongRoot}/chapters/v1-c005`);
  await expect(page.getByRole("heading", { level: 1, name: "三春甲木" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("本卷正文载入失败");
  const documentRequestsBeforeRetry = documentRequests;
  await page.getByRole("button", { name: "重试当前卷" }).click();
  await expect(page.locator(".chapter-prose")).toContainText("三春甲木");
  expect(attempts).toBeGreaterThanOrEqual(2);
  expect(documentRequests).toBe(documentRequestsBeforeRetry);
});

test("《心经》全卷、正文、译者署名与全书首尾完整可读", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));

  await page.goto(xinjingRoot);
  await expect(page.getByRole("heading", {
    level: 1,
    name: "般若波罗蜜多心经",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "唐三藏法师玄奘 译",
  })).toBeVisible();
  await expect(page.locator(".book-hero")).toContainText("典籍 · 1 卷 · 1 篇");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);

  await page.goto(`${xinjingRoot}/volumes/v1`);
  await expect(page.getByRole("heading", { level: 1, name: "全卷" })).toBeVisible();
  await expect(page.locator(".volume-home")).toContainText("1 篇");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);

  await page.goto(`${xinjingRoot}/chapters/v1-c001`);
  await expect(page.getByRole("heading", { level: 1, name: "正文" })).toBeVisible();
  await expect(page.locator(".chapter-heading")).toContainText("唐三藏法师玄奘 译");
  await expect(page.locator(".chapter-prose")).toContainText("观自在菩萨。行深般若波罗蜜多时。");
  await expect(page.locator(".chapter-prose")).toContainText("般罗僧揭帝。菩提僧莎诃。");
  await expect(page.locator(".chapter-prose")).not.toContainText("大正藏第8册");
  await expect(page.locator(".chapter-neighbors .is-unavailable").first()).toContainText("全书之始");
  await expect(page.locator(".chapter-neighbors .is-unavailable").last()).toContainText("全书之末");
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);
  await expectNoSeriousA11y(page);
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
    xinjingRoot,
    `${xinjingRoot}/volumes/v1`,
    `${xinjingRoot}/chapters/v1-c001`,
    qiongtongRoot,
    `${qiongtongRoot}/volumes/v1`,
    `${qiongtongRoot}/chapters/v1-c008`,
    jingangRoot,
    `${jingangRoot}/volumes/v1`,
    `${jingangRoot}/chapters/v1-c015`,
    "/books/missing",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoSeriousA11y(page);
  }
});
