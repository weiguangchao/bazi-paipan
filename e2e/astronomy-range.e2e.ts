import { expect, test } from "@playwright/test";

for (const date of ["1801-01-01", "2099-12-31"]) {
  test(`正式范围边界 ${date} 可从 URL 恢复并完成排盘`, async ({ page }) => {
    await page.goto(`/?date=${date}&time=12%3A00&gender=男`);
    await expect(page.locator("#date-trigger")).toContainText(
      date.startsWith("1801") ? "1801年1月1日" : "2099年12月31日",
    );
    await page.getByRole("button", { name: "排盘", exact: true }).click();
    await expect(page.getByRole("heading", { name: "四柱" })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("date")).toBe(date);
  });
}

for (const date of ["1800-12-31", "2100-01-01"]) {
  test(`范围外 URL 日期 ${date} 被忽略`, async ({ page }) => {
    await page.goto(`/?date=${date}&time=12%3A00&gender=男`);
    await expect(page.locator("#date-trigger")).toContainText("2000年1月1日");
  });
}
