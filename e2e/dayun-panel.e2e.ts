import { expect, test, type Page } from "@playwright/test";

const preLichunNow = new Date("2025-01-20T04:00:00.000Z");

async function openMingpan(page: Page, now = preLichunNow): Promise<void> {
  await page.clock.setFixedTime(now);
  await page.goto("/");
  await page.getByRole("button", { name: "排盘", exact: true }).click();
}

async function selectDayunStartingIn(page: Page, year: number): Promise<void> {
  await page.getByTestId("dayun-card").filter({ hasText: String(year) }).click();
}

async function selectLiunian(page: Page, year: number): Promise<void> {
  await page.getByTestId("liunian-card").filter({ hasText: String(year) }).click();
}

test("三级卡片保留本层点击态并在切换上层时重置下层", async ({ page }) => {
  await openMingpan(page);

  const dayunCards = page.getByTestId("dayun-card");
  const liunianCards = page.getByTestId("liunian-card");
  const liuyueCards = page.getByTestId("liuyue-card");

  await expect(dayunCards).toHaveCount(10);
  await expect(liunianCards).toHaveCount(0);
  await expect(liuyueCards).toHaveCount(0);

  await selectDayunStartingIn(page, 2017);
  await expect(liunianCards).toHaveCount(10);
  await expect(page.getByTestId("dayun-card").filter({ hasText: "2017" })).toHaveAttribute("data-state", "on");

  await selectLiunian(page, 2024);
  await expect(liuyueCards).toHaveCount(12);
  await expect(page.getByTestId("liunian-card").filter({ hasText: "2024" })).toHaveAttribute("data-state", "on");

  const xiaohan = liuyueCards.filter({ hasText: "小寒" });
  await xiaohan.click();
  await expect(xiaohan).toHaveAttribute("data-state", "on");
  await expect(page.getByTestId("dayun-card").filter({ hasText: "2017" })).toHaveAttribute("data-state", "on");
  await expect(page.getByTestId("liunian-card").filter({ hasText: "2024" })).toHaveAttribute("data-state", "on");
  await expect(page.getByRole("main").getByRole("radiogroup")).toHaveCount(3);
  await expect(liunianCards).toHaveCount(10);
  await expect(liuyueCards).toHaveCount(12);
  await xiaohan.click();
  await expect(xiaohan).toHaveAttribute("data-state", "on");

  await selectLiunian(page, 2025);
  await expect(page.locator('[data-testid="liuyue-card"][data-state="on"]')).toHaveCount(0);

  await selectDayunStartingIn(page, 2027);
  await expect(page.locator('[data-testid="liunian-card"][data-state="on"]')).toHaveCount(0);
  await expect(liuyueCards).toHaveCount(0);
});

test("当前徽标与点击态分离，流月字段按规定顺序展示", async ({ page }) => {
  await openMingpan(page);

  const currentDayun = page.getByTestId("dayun-card").filter({ hasText: "当前" });
  await expect(currentDayun).toHaveAttribute("data-state", "off");
  await currentDayun.click();
  await expect(currentDayun).toHaveAttribute("data-state", "on");
  await expect(currentDayun.getByText("当前", { exact: true })).toBeVisible();

  const currentYear = page.getByTestId("liunian-card").filter({ hasText: "今年" });
  await expect(currentYear).toContainText("2025");
  await expect(currentYear).toHaveAttribute("data-state", "off");

  await selectLiunian(page, 2024);
  const currentLiuyue = page.getByTestId("liuyue-card").filter({ hasText: "当前" });
  await expect(currentLiuyue.locator("[data-liuyue-field]")).toHaveText([
    "小寒",
    "1/5",
    "丁印",
    "丑劫",
  ]);
  await expect(currentLiuyue).toHaveAttribute("data-state", "off");
  await currentLiuyue.click();
  await expect(currentLiuyue).toHaveAttribute("data-state", "on");
  await expect(currentLiuyue.getByText("当前", { exact: true })).toBeVisible();
});

test("普通月份今年与当前流月同属同一流年", async ({ page }) => {
  await openMingpan(page, new Date("2025-07-20T04:00:00.000Z"));
  await selectDayunStartingIn(page, 2017);

  const currentYear = page.getByTestId("liunian-card").filter({ hasText: "今年" });
  await expect(currentYear).toContainText("2025");
  await currentYear.click();

  const currentLiuyue = page.getByTestId("liuyue-card").filter({ hasText: "当前" });
  await expect(currentLiuyue).toHaveCount(1);
  await expect(currentLiuyue).toContainText("小暑");
});

for (const scenario of [
  {
    name: "交节前一毫秒仍标记寅月",
    now: new Date("2024-03-05T02:22:44.981Z"),
    currentJie: "立春",
  },
  {
    name: "交节瞬间切换标记卯月",
    now: new Date("2024-03-05T02:22:44.982Z"),
    currentJie: "惊蛰",
  },
]) {
  test(scenario.name, async ({ page }) => {
    await openMingpan(page, scenario.now);
    await selectDayunStartingIn(page, 2017);
    await selectLiunian(page, 2024);

    const currentLiuyue = page.getByTestId("liuyue-card").filter({ hasText: "当前" });
    await expect(currentLiuyue).toHaveCount(1);
    await expect(currentLiuyue).toContainText(scenario.currentJie);
  });
}

for (const viewport of [
  { name: "桌面", width: 1280, height: 900 },
  { name: "窄屏", width: 390, height: 844 },
]) {
  test(`${viewport.name}视口可横向操作三层卡片`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openMingpan(page);

    const dayunLayer = page.getByRole("radiogroup", { name: "大运" });
    await expect(dayunLayer).toHaveCSS("overflow-x", "auto");
    await page.getByTestId("dayun-card").last().click();
    await expect(page.getByTestId("dayun-card").last()).toHaveAttribute("data-state", "on");

    const liunianLayer = page.getByRole("radiogroup", { name: "流年" });
    await expect(liunianLayer).toHaveCSS("overflow-x", "auto");
    await page.getByTestId("liunian-card").last().click();
    await expect(page.getByTestId("liunian-card").last()).toHaveAttribute("data-state", "on");

    const liuyueLayer = page.getByRole("radiogroup", { name: "流月" });
    await expect(liuyueLayer).toHaveCSS("overflow-x", "auto");
    await page.getByTestId("liuyue-card").last().click();
    await expect(page.getByTestId("liuyue-card").last()).toHaveAttribute("data-state", "on");

    if (viewport.name === "窄屏") {
      await expect.poll(() => liuyueLayer.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    }
  });
}
