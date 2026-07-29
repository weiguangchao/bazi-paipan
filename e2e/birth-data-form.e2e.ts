import { expect, test } from "@playwright/test";

test("命盘链接恢复后由用户明确提交，并一起更新命盘与 URL", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2025-07-20T04:00:00.000Z"));
  await page.goto(
    "/?date=1990-05-15&time=16%3A00&gender=女"
      + "&province=北京市&city=市辖区&stale=1",
  );

  await expect(page.locator("#date-trigger")).toContainText("1990年5月15日");
  await expect(page.getByLabel("出生时间")).toHaveValue("16:00");
  await expect(page.getByRole("radio", { name: "女" })).toBeChecked();
  await expect(page.locator("#province-trigger")).toContainText("北京市");
  await expect(page.locator("#city-trigger")).toContainText("市辖区");
  await expect(page.getByRole("heading", { name: "四柱" })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("stale")).toBe("1");

  await page.getByRole("button", { name: "排盘", exact: true }).click();

  await expect(page.getByRole("heading", { name: "四柱" })).toBeVisible();
  await expect
    .poll(() => [...new URL(page.url()).searchParams.entries()])
    .toEqual([
      ["date", "1990-05-15"],
      ["time", "16:00"],
      ["gender", "女"],
      ["province", "北京市"],
      ["city", "市辖区"],
    ]);
});
