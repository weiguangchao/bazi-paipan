import { expect, test } from "@playwright/test";

test("典籍首页、篇章直达、正文与跨卷导航 smoke", async ({ page }) => {
  await page.goto("/books/yuanhaiziping");
  await expect(page.getByRole("heading", { level: 1, name: "渊海子平" })).toBeVisible();

  await page.goto("/books/yuanhaiziping/chapters/v1-c069");
  await expect(page.getByRole("heading", { level: 1, name: "喜忌篇" })).toBeVisible();
  await expect(page.locator(".chapter-prose")).not.toBeEmpty();
  await page.getByRole("link", { name: /下一篇.*继善篇/ }).click();
  await expect(page).toHaveURL(/\/chapters\/v2-c001$/);
  await expect(page.getByRole("heading", { level: 1, name: "继善篇" })).toBeVisible();
});
