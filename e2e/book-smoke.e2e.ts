import { expect, test } from "@playwright/test";

test("三部典籍首页、篇章直达、正文与跨卷导航 smoke", async ({ page }) => {
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
});
