#!/usr/bin/env tsx
// 出生省下拉「不选（按北京时间）」菜单项 + 省市 toggle 移除 的 E2E 冒烟验证。
// 复用已安装的 playwright 库（与 scrape-wenzhen.ts 同源），不引入 @playwright/test。
//
// 用法：
//   npm run dev -- --port 5174 --strictPort   # 先启动开发服务器
//   E2E_BASE_URL=http://localhost:5174 npx tsx scripts/e2e-birthplace.ts
"use strict";

import { chromium, type Page } from "playwright";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5174";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  const tag = cond ? "PASS" : "FAIL";
  console.log("[" + tag + "] " + name + (detail ? " -> " + detail : ""));
  if (!cond) failures++;
}

const PROVINCE_TRIGGER = "#province-trigger";
const CITY_TRIGGER = "#city-trigger";

async function openProvince(page: Page): Promise<void> {
  await page.locator(PROVINCE_TRIGGER).click();
}
async function openCity(page: Page): Promise<void> {
  await page.locator(CITY_TRIGGER).click();
}
async function provinceText(page: Page): Promise<string> {
  return (await page.locator(PROVINCE_TRIGGER).textContent()) ?? "";
}
async function cityText(page: Page): Promise<string> {
  return (await page.locator(CITY_TRIGGER).textContent()) ?? "";
}

// 点选下拉项；找不到时返回 false 而非抛错，使冒烟脚本能跑完全部检查。
async function tryPick(page: Page, name: string): Promise<boolean> {
  const opt = page.getByRole("option", { name, exact: true });
  try {
    await opt.waitFor({ state: "visible", timeout: 4000 });
    await opt.click();
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.locator(PROVINCE_TRIGGER).waitFor({ state: "visible" });

    // 1. 省份下拉含「不选（按北京时间）」置顶项
    await openProvince(page);
    const noneVisible = await page
      .getByRole("option", { name: "不选（按北京时间）", exact: true })
      .isVisible()
      .catch(() => false);
    check("省份下拉含「不选（按北京时间）」项", noneVisible);
    await page.keyboard.press("Escape");

    // 2. 点「不选」清空省份并禁用城市
    await openProvince(page);
    await tryPick(page, "北京市");
    check("选北京市后触发器显示北京市", (await provinceText(page)).includes("北京市"));
    await openProvince(page);
    const pickedNone = await tryPick(page, "不选（按北京时间）");
    const afterNone = await provinceText(page);
    const cityDisabled = await page.locator(CITY_TRIGGER).isDisabled();
    check("能点选「不选」项", pickedNone);
    check("点「不选」后省份回到占位符", afterNone.includes("不选（按北京时间）"), "实际: " + afterNone);
    check("点「不选」后城市禁用", cityDisabled);

    // 3. 省份不再 toggle：重复点已选省份不清空
    await openProvince(page);
    await tryPick(page, "北京市");
    check("选北京市", (await provinceText(page)).includes("北京市"));
    await openProvince(page);
    await tryPick(page, "北京市");
    const afterReselect = await provinceText(page);
    check("重复点北京市不清空（toggle 移除）", afterReselect.includes("北京市"), "实际: " + afterReselect);

    // 4. 城市不再 toggle：重复点已选城市不清空
    await openCity(page);
    await tryPick(page, "市辖区");
    check("选市辖区", (await cityText(page)).includes("市辖区"));
    await openCity(page);
    await tryPick(page, "市辖区");
    const afterCityReselect = await cityText(page);
    check("重复点市辖区不清空（toggle 移除）", afterCityReselect.includes("市辖区"), "实际: " + afterCityReselect);

    // 5. 选唯一城市省自动携带城市：北京市 -> 城市字段自动显示"市辖区"，无需点城市下拉
    await openProvince(page);
    await tryPick(page, "北京市");
    await page.keyboard.press("Escape");
    const autoCity = await cityText(page);
    check("选北京市后城市自动显示市辖区", autoCity.includes("市辖区"), "实际: " + autoCity);

    // 6. 多城市直辖市不自动填：重庆市 -> 城市字段仍为占位符"选择城市"
    await openProvince(page);
    await tryPick(page, "重庆市");
    await page.keyboard.press("Escape");
    const chongqingCity = await cityText(page);
    check("选重庆市后城市不自动填（仍占位）", !chongqingCity.includes("市辖区") && chongqingCity.includes("选择城市"), "实际: " + chongqingCity);
  } finally {
    await browser.close();
  }

  if (failures > 0) {
    console.error("\n" + failures + " 项检查失败");
    process.exit(1);
  }
  console.log("\n全部检查通过");
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
