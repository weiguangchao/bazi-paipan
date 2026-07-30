import { expect, test } from "@playwright/test";

test("六部典籍首页、篇章直达、正文与导航 smoke", async ({ page }) => {
  for (const book of [
    {
      root: "/books/yuanhaiziping",
      title: "渊海子平",
      current: "v1-c069",
      currentTitle: "喜忌篇",
      next: "v2-c001",
      nextTitle: "继善篇",
    },
    {
      root: "/books/sanmingtonghui",
      title: "三命通会",
      current: "v1-c036",
      currentTitle: "壬戌癸亥大海水",
      next: "v2-c001",
      nextTitle: "论天干阴阳生死",
    },
    {
      root: "/books/wudenghuiyuan",
      title: "五灯会元",
      current: "v1-c040",
      currentTitle: "六祖慧能大鉴禅师",
      next: "v2-c001",
      nextTitle: "牛头山法融禅师",
    },
  ]) {
    await page.goto(book.root);
    await expect(page.getByRole("heading", { level: 1, name: book.title })).toBeVisible();
    await page.goto(`${book.root}/chapters/${book.current}`);
    await expect(page.getByRole("heading", { level: 1, name: book.currentTitle })).toBeVisible();
    await expect(page.locator(".chapter-prose")).not.toBeEmpty();
    await page.getByRole("link", { name: new RegExp(`下一篇.*${book.nextTitle}`) }).click();
    await expect(page).toHaveURL(new RegExp(`${book.next}$`));
    await expect(page.getByRole("heading", { level: 1, name: book.nextTitle })).toBeVisible();
  }

  await page.goto("/books/xinjing");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "般若波罗蜜多心经",
  })).toBeVisible();
  await page.goto("/books/xinjing/chapters/v1-c001");
  await expect(page.getByRole("heading", { level: 1, name: "正文" })).toBeVisible();
  await expect(page.locator(".chapter-prose")).toContainText("观自在菩萨");
  await expect(page.locator(".chapter-neighbors .is-unavailable")).toHaveCount(2);

  await page.goto("/books/qiongtongbaojian");
  await expect(page.getByRole("heading", { level: 1, name: "穷通宝鉴" })).toBeVisible();
  await page.goto("/books/qiongtongbaojian/chapters/v1-c001");
  await expect(page.getByRole("heading", { level: 1, name: "序言" })).toBeVisible();
  await expect(page.locator(".chapter-prose")).not.toBeEmpty();
  await page.getByRole("link", { name: /下一篇.*五行总论/ }).click();
  await expect(page).toHaveURL(/v1-c002$/);
  await expect(page.getByRole("heading", { level: 1, name: "五行总论" })).toBeVisible();

  await page.goto("/books/jingangjing");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "金刚般若波罗蜜经",
  })).toBeVisible();
  await page.goto("/books/jingangjing/chapters/v1-c001");
  await expect(page.getByRole("heading", { level: 1, name: "开经偈" })).toBeVisible();
  await expect(page.locator(".chapter-prose")).toContainText("无上甚深微妙法");
  await page.getByRole("link", { name: /下一篇.*法会因由分第一/ }).click();
  await expect(page).toHaveURL(/v1-c002$/);
  await expect(page.getByRole("heading", {
    level: 1,
    name: "法会因由分第一",
  })).toBeVisible();
});
