import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("窄屏共享目录、焦点、正文、表格与相邻导航可用", async ({ page }) => {
  for (const path of [
    "/books/yuanhaiziping/chapters/v1-c046",
    "/books/sanmingtonghui/chapters/v10-c001",
    "/books/wudenghuiyuan/chapters/v9-c001",
    "/books/xinjing/chapters/v1-c001",
    "/books/qiongtongbaojian/chapters/v1-c005",
    "/books/jingangjing/chapters/v1-c015",
  ]) {
    await page.goto(path);
    await expect(page.locator(".reader-directory")).toBeHidden();
    await expect(page.locator("html")).toHaveJSProperty(
      "scrollWidth",
      await page.locator("html").evaluate((element) => element.clientWidth),
    );
    const trigger = page.getByRole("button", { name: "目录" });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "移动端篇章目录" });
    await expect(drawer).toBeVisible();
    expect((await drawer.boundingBox())?.width ?? 999).toBeLessThanOrEqual(360);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator(".chapter-neighbors")).toHaveCSS("grid-template-columns", /.+/);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  }

  await page.goto("/books/yuanhaiziping/chapters/v1-c046");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await expect(table.locator("th")).toHaveCount(4);
  await expect(table.locator("..")).toHaveCSS("overflow-x", "auto");

  await page.goto("/books/qiongtongbaojian/chapters/v1-c005");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.locator(".chapter-prose blockquote")).toContainText("徐乐吾评注");
});
