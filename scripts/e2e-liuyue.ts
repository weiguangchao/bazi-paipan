#!/usr/bin/env tsx
import { chromium, type Locator } from "playwright";
import { createServer } from "vite";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertPressed(locator: Locator, expected: boolean, message: string): Promise<void> {
  assert((await locator.getAttribute("data-state")) === (expected ? "on" : "off"), message);
}

async function verifyScenario(page: import("playwright").Page, baseUrl: string): Promise<void> {
  await page.addInitScript(() => {
    const scope = globalThis as typeof globalThis & { __e2eNow: number };
    scope.__e2eNow = Date.UTC(2025, 0, 4, 4, 0);
    Date.now = () => scope.__e2eNow;
  });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    (globalThis as typeof globalThis & { __e2eNow: number }).__e2eNow =
      Date.UTC(2025, 0, 20, 4, 0);
  });
  await page.getByRole("button", { name: "排盘", exact: true }).click();

  const dayunCards = page.getByTestId("dayun-card");
  const liunianCards = page.getByTestId("liunian-card");
  const liuyueCards = page.getByTestId("liuyue-card");

  assert(await dayunCards.count() === 10, "排盘后应展示十张大运卡");
  assert(await liunianCards.count() === 0, "初始不应自动展开流年");
  assert(await liuyueCards.count() === 0, "初始不应自动展开流月");

  const dayun2017 = page.getByTestId("dayun-card").filter({ hasText: "2017" });
  await dayun2017.click();
  assert(await liunianCards.count() === 10, "点击大运后应展开十张流年卡");
  await assertPressed(dayun2017, true, "点击的大运应保持选中");

  const liunian2024 = page.getByTestId("liunian-card").filter({ hasText: "2024" });
  await liunian2024.click();
  assert(await liuyueCards.count() === 12, "点击流年后应展开十二张流月卡");
  await assertPressed(liunian2024, true, "点击的流年应保持选中");

  const currentLiuyueCard = liuyueCards.filter({ hasText: "小寒" });
  const content = await currentLiuyueCard.locator("[data-liuyue-field]").allTextContents();
  assert(
    JSON.stringify(content) === JSON.stringify(["小寒", "1/5", "丁印", "丑劫"]),
    `流月卡字段顺序错误：${JSON.stringify(content)}`,
  );
  assert((await currentLiuyueCard.textContent())?.includes("当前") === true, "点击排盘时的当前丑月应有当前徽标");
  await currentLiuyueCard.click();
  await assertPressed(currentLiuyueCard, true, "流月卡应支持点击态");
  await currentLiuyueCard.click();
  await assertPressed(currentLiuyueCard, true, "再次点击同一流月不应取消");

  const liunian2025 = page.getByTestId("liunian-card").filter({ hasText: "2025" });
  assert((await liunian2025.textContent())?.includes("今年") === true, "2025 流年应有今年徽标");
  await liunian2025.click();
  assert(
    await page.locator('[data-testid="liuyue-card"][data-state="on"]').count() === 0,
    "切换流年应清除已选流月",
  );

  const dayun2027 = page.getByTestId("dayun-card").filter({ hasText: "2027" });
  await dayun2027.click();
  assert(
    await page.locator('[data-testid="liunian-card"][data-state="on"]').count() === 0,
    "切换大运应清除已选流年",
  );
  assert(await liuyueCards.count() === 0, "切换大运应清除并收起流月");
}

async function main(): Promise<void> {
  const server = await createServer({
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const baseUrl = server.resolvedUrls?.local[0];
  assert(baseUrl !== undefined, "Vite 未返回本地测试地址");

  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await verifyScenario(desktop, baseUrl);
    await desktop.close();

    const narrow = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await verifyScenario(narrow, baseUrl);
    await narrow.close();
  } finally {
    await browser.close();
    await server.close();
  }

  console.log("流月三级联动 Playwright 页面测试通过");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
