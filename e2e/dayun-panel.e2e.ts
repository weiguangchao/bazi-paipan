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

function currentCard(page: Page, testId: string) {
  return page
    .getByTestId(testId)
    .filter({ has: page.locator('[data-current-marker="seal"]') });
}

async function expectCardVisibleInLayer(page: Page, cardTestId: string, layerName: string): Promise<void> {
  const card = page.locator(`[data-testid="${cardTestId}"][data-state="on"]`);
  const layer = page.getByRole("radiogroup", { name: layerName });
  await expect.poll(async () => {
    const [cardBox, layerBox] = await Promise.all([card.boundingBox(), layer.boundingBox()]);
    return Boolean(
      cardBox
      && layerBox
      && cardBox.x >= layerBox.x
      && cardBox.x + cardBox.width <= layerBox.x + layerBox.width,
    );
  }).toBe(true);
}

test("三级卡片保留本层点击态并在切换上层时重置下层", async ({ page }) => {
  await openMingpan(page);

  const dayunCards = page.getByTestId("dayun-card");
  const liunianCards = page.getByTestId("liunian-card");
  const liuyueCards = page.getByTestId("liuyue-card");

  await expect(dayunCards).toHaveCount(10);
  await expect(liunianCards).toHaveCount(10);
  await expect(page.getByTestId("dayun-card").filter({ hasText: "2017" })).toHaveAttribute("data-state", "on");
  await expect(page.getByTestId("liunian-card").filter({ hasText: "2025" })).toHaveAttribute("data-state", "on");
  await expect(liuyueCards).toHaveCount(12);
  await expect(page.locator('[data-testid="liuyue-card"][data-state="on"]')).toHaveCount(0);

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
  await expect(page.locator('[data-testid="liunian-card"][data-state="on"]')).toContainText("2027");
  await expect(liuyueCards).toHaveCount(12);
  await expect(page.locator('[data-testid="liuyue-card"][data-state="on"]')).toHaveCount(0);
});

test("当前徽标与点击态分离，流月字段按规定顺序展示", async ({ page }) => {
  await openMingpan(page);

  const currentDayun = currentCard(page, "dayun-card");
  await expect(currentDayun).toHaveAttribute("data-state", "on");
  await expect(currentDayun.getByText("当前", { exact: true })).toBeVisible();

  const currentYear = page.getByTestId("liunian-card").filter({ hasText: "今年" });
  await expect(currentYear).toContainText("2025");
  await expect(currentYear).toHaveAttribute("data-state", "on");

  await selectLiunian(page, 2024);
  const currentLiuyue = currentCard(page, "liuyue-card");
  await expect(currentLiuyue.locator("[data-liuyue-field]")).toHaveText([
    "小寒",
    "1/5",
    "丁印",
    "丑劫",
  ]);
  await expect(currentLiuyue).toHaveAttribute("data-state", "off");
  await currentLiuyue.click();
  await expect(currentLiuyue).toHaveAttribute("data-state", "on");
  await expect(currentLiuyue.getByText("本月", { exact: true })).toBeVisible();
});

test("普通月份今年与当前流月同属同一流年", async ({ page }) => {
  await openMingpan(page, new Date("2025-07-20T04:00:00.000Z"));

  const currentYear = page.getByTestId("liunian-card").filter({ hasText: "今年" });
  await expect(currentYear).toContainText("2025");
  await expect(currentYear).toHaveAttribute("data-state", "on");

  const currentLiuyue = currentCard(page, "liuyue-card");
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

    const currentLiuyue = currentCard(page, "liuyue-card");
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
    await expectCardVisibleInLayer(page, "dayun-card", "大运");

    const liunianLayer = page.getByRole("radiogroup", { name: "流年" });
    await expect(liunianLayer).toHaveCSS("overflow-x", "auto");
    await expectCardVisibleInLayer(page, "liunian-card", "流年");

    const liuyueLayer = page.getByRole("radiogroup", { name: "流月" });
    await expect(liuyueLayer).toHaveCSS("overflow-x", "auto");
    await expect(liuyueLayer).toHaveJSProperty("scrollLeft", 0);
    await expect(page.locator('[data-testid="liuyue-card"][data-state="on"]')).toHaveCount(0);

    if (viewport.name === "桌面") {
      for (const layer of [dayunLayer, liunianLayer, liuyueLayer]) {
        await expect.poll(() =>
          layer.evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true);
      }
    }

    await page.getByTestId("dayun-card").last().click();
    await expect(page.getByTestId("dayun-card").last()).toHaveAttribute("data-state", "on");

    await page.getByTestId("liunian-card").last().click();
    await expect(page.getByTestId("liunian-card").last()).toHaveAttribute("data-state", "on");

    await page.getByTestId("liuyue-card").last().click();
    await expect(page.getByTestId("liuyue-card").last()).toHaveAttribute("data-state", "on");

    if (viewport.name === "窄屏") {
      await expect.poll(() => liuyueLayer.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await page.getByTestId("liunian-card").first().click();
      await expect(liuyueLayer).toHaveJSProperty("scrollLeft", 0);
    }
  });
}

test("自动携带不抢焦点，选择不写入 URL，页面跨年不自动改选", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2025-12-31T15:59:00.000Z"));
  await page.goto("/");
  const submit = page.getByRole("button", { name: "排盘", exact: true });
  await submit.click();

  await expect(submit).toBeFocused();
  await expect(page.locator('[data-testid="liunian-card"][data-state="on"]')).toContainText("2025");

  await selectDayunStartingIn(page, 2007);
  await selectLiunian(page, 2010);
  await page.getByTestId("liuyue-card").first().click();
  const params = new URL(page.url()).searchParams;
  expect([...params.keys()]).toEqual(["date", "time", "gender"]);

  await submit.click();
  await expect(page.locator('[data-testid="liunian-card"][data-state="on"]')).toContainText("2025");
  await page.clock.fastForward(120_000);
  await expect(page.locator('[data-testid="liunian-card"][data-state="on"]')).toContainText("2025");
});

test("点击排盘自动携带时不改变页面纵向位置", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  const scrollYBeforeSubmit = await page.evaluate(() => window.scrollY);

  await page.getByRole("button", { name: "排盘", exact: true }).click();
  await expect(currentCard(page, "dayun-card")).toHaveAttribute("data-state", "on");
  await expect(page.getByTestId("liunian-card").filter({ hasText: "今年" })).toHaveAttribute("data-state", "on");

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollYBeforeSubmit);
});
