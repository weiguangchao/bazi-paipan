import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const root = "/books/yuanhaiziping";
const volumeChunk = /\/assets\/v[1-5]-[^/]+\.js$/;

async function expectNoSeriousA11y(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
}

test("五个卷首页与各卷首末篇均支持真实直达和刷新", async ({ page }) => {
  const boundaries = [
    ["v1", "v1-c001", "v1-c069"],
    ["v2", "v2-c001", "v2-c070"],
    ["v3", "v3-c001", "v3-c038"],
    ["v4", "v4-c001", "v4-c027"],
    ["v5", "v5-c001", "v5-c065"],
  ] as const;
  for (const [volume, first, last] of boundaries) {
    await page.goto(`${root}/volumes/${volume}`);
    await expect(page.locator("main")).toContainText(`卷${"一二三四五"[Number(volume.slice(1)) - 1]}`);
    for (const chapter of [first, last]) {
      await page.goto(`${root}/chapters/${chapter}`);
      await expect(page.locator(".chapter-prose")).not.toBeEmpty();
      await page.reload();
      await expect(page.locator(".chapter-prose")).not.toBeEmpty();
    }
  }
});

test("canonical 与异常地址遵守 replace 和原 URL 保留规则", async ({ page }) => {
  await page.goto(`${root}/chapters/v1-c001/?from=test`);
  await expect(page).toHaveURL(`${root}/chapters/v1-c001?from=test`);
  await page.goBack();
  await expect(page).not.toHaveURL(/v1-c001\/$/);

  for (const invalid of [
    "/books/YuanHaiZiPing",
    `${root}/chapters/v1_c001`,
    `${root}/chapters/unknown`,
    `${root}/chapters`,
    `${root}/chapters/v1-c001/extra`,
  ]) {
    await page.goto(invalid);
    await expect(page.getByRole("heading", { name: /不存在/ })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(invalid);
    await expect(page.getByRole("link", { name: /返回《渊海子平》首页/ })).toBeVisible();
  }
});

test("四个跨卷边界及全书首尾占位严格连续", async ({ page }) => {
  for (const [current, next] of [
    ["v1-c069", "v2-c001"],
    ["v2-c070", "v3-c001"],
    ["v3-c038", "v4-c001"],
    ["v4-c027", "v5-c001"],
  ]) {
    await page.goto(`${root}/chapters/${current}`);
    await page.getByRole("link", { name: /下一篇/ }).click();
    await expect(page).toHaveURL(new RegExp(`${next}$`));
  }
  await page.goto(`${root}/chapters/v1-c001`);
  await expect(page.locator(".chapter-neighbors .is-unavailable").first()).toContainText("全书之始");
  await page.goto(`${root}/chapters/v5-c065`);
  await expect(page.locator(".chapter-neighbors .is-unavailable").last()).toContainText("全书之末");
});

test("目录、正文语义、复制文本和响应式布局可用", async ({ page }, testInfo) => {
  await page.goto(`${root}/chapters/v1-c046`);
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("table").locator("th")).toHaveCount(4);
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.locator("html").evaluate((element) => element.clientWidth));

  const mobile = testInfo.project.name === "webkit-mobile";
  if (mobile) {
    await expect(page.locator(".reader-directory")).toBeHidden();
    const trigger = page.getByRole("button", { name: "目录" });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "移动端篇章目录" });
    await expect(drawer).toBeVisible();
    expect((await drawer.boundingBox())?.width ?? 999).toBeLessThanOrEqual(360);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator(".chapter-neighbors")).toHaveCSS("grid-template-columns", /.+/);
  } else {
    await expect(page.locator(".reader-directory")).toBeVisible();
    await expect(page.locator(".reader-directory")).toHaveCSS("position", "sticky");
    await expect(page.getByRole("button", { name: "目录" })).toBeHidden();
    expect((await page.locator(".chapter-prose").boundingBox())?.width ?? 9999).toBeLessThanOrEqual(752);
  }

  const paragraph = page.locator(".chapter-prose p").first();
  await paragraph.selectText();
  if (mobile) {
    expect((await page.evaluate(() => window.getSelection()?.toString() ?? "")).trim().length).toBeGreaterThan(5);
  } else {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.keyboard.press("Meta+C");
    expect((await page.evaluate(() => navigator.clipboard.readText())).trim().length).toBeGreaterThan(5);
  }
});

test("页面级网络边界、同卷缓存、跨卷预取均符合契约", async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  await page.goto("/");
  expect(requests.some((request) => request.includes("CatalogRoutes") || request.includes("ChapterReader") || volumeChunk.test(request))).toBe(false);

  requests.length = 0;
  await page.goto(root);
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);
  await page.goto(`${root}/volumes/v1`);
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(0);

  requests.length = 0;
  await page.goto(`${root}/chapters/v1-c001`);
  await expect(page.getByRole("heading", { level: 1, name: "论五行所生之始" })).toBeVisible();
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);
  await page.getByRole("link", { name: /下一篇.*论天干地支所出/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "论天干地支所出" })).toBeVisible();
  expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(1);

  await page.goto(`${root}/chapters/v1-c069`);
  await expect(page.getByRole("heading", { level: 1, name: "喜忌篇" })).toBeVisible();
  const beforePrefetch = requests.filter((request) => volumeChunk.test(request)).length;
  if (testInfo.project.name === "webkit-mobile") {
    await page.getByRole("button", { name: "目录" }).click();
    await page.waitForTimeout(200);
    expect(requests.filter((request) => volumeChunk.test(request))).toHaveLength(beforePrefetch);
  } else {
    await page.getByRole("link", { name: /下一篇.*继善篇/ }).hover();
    await expect.poll(() => requests.filter((request) => volumeChunk.test(request)).length).toBe(beforePrefetch + 1);
  }
});

test("典籍首页、卷首页、篇章页与 Not Found 无 serious/critical a11y 违规", async ({ page }) => {
  for (const path of [root, `${root}/volumes/v1`, `${root}/chapters/v1-c046`, `${root}/missing`]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoSeriousA11y(page);
  }
});

test("正文加载失败保留身份、导航和可重试错误状态", async ({ page }) => {
  let attempts = 0;
  await page.route(/\/assets\/v1-[^/]+\.js$/, async (route) => {
    attempts += 1;
    if (attempts === 1) await route.abort();
    else await route.continue();
  });
  await page.goto(`${root}/chapters/v1-c001`);
  await expect(page.getByRole("heading", { level: 1, name: "论五行所生之始" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("本篇内容无法渲染");
  await expect(page.getByRole("navigation", { name: "相邻篇章" })).toBeVisible();
  await expectNoSeriousA11y(page);
  const navigated = page.waitForEvent("framenavigated");
  await page.getByRole("button", { name: "重试当前卷" }).click();
  await navigated;
  await expect(page.locator(".chapter-prose")).toContainText("天地未判");
  expect(attempts).toBeGreaterThanOrEqual(2);
});
