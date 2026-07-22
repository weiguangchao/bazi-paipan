#!/usr/bin/env tsx
// 问真八字 338 市真太阳时 + 经度抓取脚本（issue #17）。
//
// 在问真八字（https://pcbz.iwzwh.com/#/paipan/index，省/市/区县三级 UI）逐个点选
// cities.generated.ts 全部 338 个地级市，输入固定取样时刻 2000-06-15 12:00，
// 抓取"地址经纬（东经）+ 真太阳时"，产出本地 JSON 数据文件
// scripts/data-src/wenzhen-338.json，供后续数据驱动回归测试消费。
//
// 脚本与数据分离：重新抓取不改测试代码。被问真限流时支持断点续跑（已抓城市跳过）
// 与单市重试（3 次失败后跳过、末尾报告）。
//
// 技术要点：
// - 页面顶部有 fixed 导航栏（z-index 999）拦截鼠标事件，脚本启动时隐藏它。
// - 地址选择器使用 Vant UI 组件，省份/城市/区县是 <div class="van-ellipsis">，
//   非 <button>，需用 textContent 匹配后 JS .click() 触发。
// - 时间选择器的输入框需 dispatch blur 事件触发 Vue v-model 更新。
// - "确定"按钮有多个（时间输入框旁 + 底部），按 y 坐标排序区分。
//
// 用法：
//   npx tsx scripts/scrape-wenzhen.ts              # 全量抓取（headless）
//   npx tsx scripts/scrape-wenzhen.ts --headed     # 有头模式（调试用）
//   npx tsx scripts/scrape-wenzhen.ts --limit 5    # 只抓前 5 市（测试用）

"use strict";

import { chromium, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES } from "../src/data/cities.generated.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── 常量 ──────────────────────────────────────────────────────────────────

const PAGE_URL = "https://pcbz.iwzwh.com/#/paipan/index";
const OUTPUT_FILE = path.join(__dirname, "data-src", "wenzhen-338.json");

/** 固定取样时刻（北京时间）：2000-06-15 12:00。6 月中均时差≈0，真太阳时主要由经度修正决定。 */
const SAMPLING_TIME = "200006151200";
const SAMPLING_TIME_DISPLAY = "2000-06-15 12:00";

/** 每市抓取间隔（毫秒），避免请求过快被限流。 */
const INTER_CITY_DELAY_MS = 400;
/** 单市最大重试次数。 */
const MAX_RETRIES = 3;
/** 操作超时（毫秒）。 */
const ACTION_TIMEOUT = 10_000;

// 时间选择器内各步操作的等待时间（毫秒）。
/** 打开选择器后等待渲染。 */
const PICKER_OPEN_WAIT_MS = 500;
/** 省/市选择后等待下级列表更新。 */
const PICKER_SELECT_WAIT_MS = 400;
/** 区县选择后等待。 */
const PICKER_DISTRICT_WAIT_MS = 200;
/** 输入框填入后等待 Vue 更新。 */
const INPUT_FILL_WAIT_MS = 200;
/** 选择器关闭后等待结果更新。 */
const PICKER_CLOSE_WAIT_MS = 500;

// ── 省短名映射 ────────────────────────────────────────────────────────────
// 问真地址选择器用省短名（内蒙古、广西等），我们数据用全名（内蒙古自治区等）。

const PROVINCE_SHORT: Record<string, string> = {
  "内蒙古自治区": "内蒙古",
  "广西壮族自治区": "广西",
  "西藏自治区": "西藏",
  "宁夏回族自治区": "宁夏",
  "新疆维吾尔自治区": "新疆",
};

/** 将我们的省全名映射为问真选择器中的省短名。 */
function toWenzhenProvince(province: string): string {
  return PROVINCE_SHORT[province] ?? province;
}

// ── 类型 ──────────────────────────────────────────────────────────────────

interface CityResult {
  province: string;
  city: string;
  longitude: number;
  trueSolarTime: string;
}

interface OutputData {
  meta: {
    source: string;
    scrapedAt: string;
    samplingTime: string;
    cityCount: number;
  };
  cities: CityResult[];
}

// ── 城市列表构建 ──────────────────────────────────────────────────────────

/** 从 CITIES 构建 (province, city) 平铺列表。重庆市的"县"与"市辖区"经度相同，只取"市辖区"。 */
function buildCityList(): { province: string; city: string }[] {
  const list: { province: string; city: string }[] = [];
  for (const [province, cities] of Object.entries(CITIES)) {
    for (const city of Object.keys(cities)) {
      if (province === "重庆市" && city === "县") continue;
      list.push({ province, city });
    }
  }
  return list;
}

// ── 断点续跑：加载已有结果 ─────────────────────────────────────────────────

/** 加载已存在的输出文件，返回已抓取的 province|city -> result 映射。 */
function loadExisting(): Map<string, CityResult> {
  const map = new Map<string, CityResult>();
  if (!fs.existsSync(OUTPUT_FILE)) return map;
  try {
    const data: OutputData = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    for (const c of data.cities) {
      map.set(`${c.province}|${c.city}`, c);
    }
    console.error(`已加载 ${map.size} 条已抓取结果，将跳过这些城市。`);
  } catch {
    console.error("警告：已有输出文件解析失败，从头开始。");
  }
  return map;
}

/** 将当前结果写入输出文件（增量保存）。 */
function saveOutput(results: Map<string, CityResult>): void {
  const cities = Array.from(results.values());
  const data: OutputData = {
    meta: {
      source: `问真八字 ${PAGE_URL}`,
      scrapedAt: new Date().toISOString(),
      samplingTime: SAMPLING_TIME_DISPLAY,
      cityCount: cities.length,
    },
    cities,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ── 页面交互 ──────────────────────────────────────────────────────────────

/** 隐藏页面顶部 fixed 导航栏，避免拦截表单区域的鼠标事件。 */
async function hideNavBar(page: Page): Promise<void> {
  await page.evaluate(() => {
    const nav = document.querySelector("#container-popup");
    if (nav) (nav as HTMLElement).style.display = "none";
  });
}

/** 在页面中找到精确匹配文本的叶子元素，点击其最近的可点击祖先行。 */
async function jsClickRow(page: Page, labelText: string): Promise<boolean> {
  return page.evaluate((label) => {
    const allEls = document.querySelectorAll("*");
    for (const el of allEls) {
      if (el.textContent === label && el.childElementCount === 0) {
        let row: Element | null = el;
        while (row && !row.className) row = row.parentElement;
        (row as HTMLElement | null)?.click();
        return true;
      }
    }
    return false;
  }, labelText);
}

/** 点击地址显示文本（.bogus-input 第二个 = 地址显示）。 */
async function clickAddressDisplay(page: Page): Promise<void> {
  // 地址显示是第二个 .bogus-input，初始显示"未知地 北京时间 --"
  // 选择后显示"省 市 区"，用 getByText 匹配当前地址显示
  const addr = page.locator(".bogus-input").nth(1);
  await addr.click({ force: true });
}

/** 点击 #datetime_box 内指定文本的 .van-ellipsis 元素。 */
async function clickVanItem(page: Page, text: string): Promise<boolean> {
  return page.evaluate((name) => {
    const box = document.querySelector("#datetime_box");
    if (!box) return false;
    for (const el of box.querySelectorAll(".van-ellipsis")) {
      if (el.textContent === name) {
        (el as HTMLElement).click();
        return true;
      }
    }
    return false;
  }, text);
}

/** 点击 #datetime_box 内第 col 列（0=省 1=市 2=区县）的第一个 .van-ellipsis。 */
async function clickFirstInColumn(page: Page, col: number): Promise<boolean> {
  return page.evaluate((column) => {
    const box = document.querySelector("#datetime_box");
    if (!box) return false;
    const pickers = box.querySelectorAll(".van-picker");
    if (pickers.length >= column + 1) {
      const firstItem = pickers[column]!.querySelector(".van-ellipsis");
      if (firstItem) {
        (firstItem as HTMLElement).click();
        return true;
      }
    }
    return false;
  }, col);
}

/**
 * 点击页面上可见的"确定"按钮。which="top" 点 y 最小（输入框旁），
 * "bottom" 点 y 最大（底部关闭）。rootSelector 限定搜索范围（默认全页）。
 */
async function clickConfirmButton(page: Page, which: "top" | "bottom", rootSelector = "body"): Promise<boolean> {
  return page.evaluate(({ which: w, root }) => {
    const rootEl = document.querySelector(root) || document;
    const visible = Array.from(rootEl.querySelectorAll("*"))
      .filter(el => el.childElementCount === 0 && el.textContent?.trim() === "确定" && el.getBoundingClientRect().width > 0) as HTMLElement[];
    if (visible.length === 0) return false;
    visible.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    const target = w === "top" ? visible[0] : visible[visible.length - 1];
    target!.click();
    return true;
  }, { which, root: rootSelector });
}

/** 读取页面上的真太阳时与地址经纬。 */
async function readResults(page: Page): Promise<{ longitude: number; trueSolarTime: string }> {
  const text = await page.evaluate(() => {
    let tst = "";
    let coord = "";
    for (const el of document.querySelectorAll("*")) {
      if (el.childElementCount === 0) {
        const t = el.textContent || "";
        if (t.includes("真太阳时：")) tst = t;
        if (t.includes("地址经纬：")) coord = t;
      }
    }
    return { tst, coord };
  });

  if (!text.tst || !text.coord) {
    throw new Error(`读取结果失败：tst="${text.tst}", coord="${text.coord}"`);
  }

  const tstMatch = text.tst.match(/真太阳时：(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
  if (!tstMatch) throw new Error(`无法解析真太阳时：${text.tst}`);

  const lngMatch = text.coord.match(/东经([\d.]+)/);
  if (!lngMatch) throw new Error(`无法解析经度：${text.coord}`);

  return {
    longitude: parseFloat(lngMatch[1]!),
    trueSolarTime: tstMatch[1]!,
  };
}

// ── 高层交互流程 ──────────────────────────────────────────────────────────

/** 设置固定取样时刻。在页面加载后调用一次。 */
async function setSamplingTime(page: Page): Promise<void> {
  // 点击"出生时间"行打开时间选择器
  const clicked = await jsClickRow(page, "出生时间");
  if (!clicked) throw new Error("无法找到'出生时间'行");
  await page.waitForTimeout(PICKER_OPEN_WAIT_MS);

  // 填入时刻
  const input = page.getByPlaceholder("输入出生年月日时分(格式199303270255)");
  await input.waitFor({ state: "visible", timeout: ACTION_TIMEOUT });
  await input.click({ force: true });
  await input.fill(SAMPLING_TIME);
  // dispatch blur 触发 Vue v-model 更新
  await page.evaluate(() => {
    const inp = document.querySelector('input[placeholder*="格式"]') as HTMLInputElement;
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    inp.dispatchEvent(new Event("change", { bubbles: true }));
    inp.dispatchEvent(new Event("blur", { bubbles: true }));
  });
  await page.waitForTimeout(INPUT_FILL_WAIT_MS);

  // 点击输入框旁的"确定"（y 坐标最小的可见"确定"）
  await clickConfirmButton(page, "top");
  await page.waitForTimeout(PICKER_OPEN_WAIT_MS);

  // 点击底部"确定"关闭时间选择器（y 坐标最大的可见"确定"）
  await clickConfirmButton(page, "bottom");
  await page.waitForTimeout(PICKER_CLOSE_WAIT_MS);

  console.error(`已设置取样时刻：${SAMPLING_TIME_DISPLAY}`);
}

/** 选择省/市/区县并确认，返回抓取到的经度与真太阳时。 */
async function selectCityAndScrape(page: Page, province: string, city: string): Promise<{ longitude: number; trueSolarTime: string }> {
  // 点击地址显示打开选择器
  await clickAddressDisplay(page);
  await page.waitForTimeout(PICKER_OPEN_WAIT_MS);

  // 选择省份（问真短名）
  const wenzhenProv = toWenzhenProvince(province);
  const provOk = await clickVanItem(page, wenzhenProv);
  if (!provOk) throw new Error(`省份"${wenzhenProv}"未找到`);
  await page.waitForTimeout(PICKER_SELECT_WAIT_MS);

  // 选择城市。直辖市（北京/天津/上海/重庆）在问真中城市列可能不显示"市辖区"，
  // 此时退守点击城市列第一项（问真会自动选中第一个区/县）。
  const cityOk = await clickVanItem(page, city);
  if (!cityOk) {
    const firstOk = await clickFirstInColumn(page, 1);
    if (!firstOk) throw new Error(`城市"${city}"未找到且城市列无可选项`);
  }
  await page.waitForTimeout(PICKER_SELECT_WAIT_MS);

  // 选择区县（第 3 列第一个）
  await clickFirstInColumn(page, 2);
  await page.waitForTimeout(PICKER_DISTRICT_WAIT_MS);

  // 点击"确定"关闭地址选择器（底部确定按钮）
  const confirmOk = await clickConfirmButton(page, "bottom", "#datetime_box");
  if (!confirmOk) throw new Error("地址选择器'确定'按钮未找到");
  await page.waitForTimeout(PICKER_CLOSE_WAIT_MS);

  // 读取结果
  return readResults(page);
}

// ── 主流程 ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const headed = args.includes("--headed");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? "0", 10) : 0;

  // 构建城市列表
  const cityList = buildCityList();
  const total = limit > 0 ? Math.min(limit, cityList.length) : cityList.length;
  console.error(`共 ${cityList.length} 个城市，${limit > 0 ? `本次抓取前 ${total} 个` : "全量抓取"}。`);

  // 加载已有结果（断点续跑）
  const results = loadExisting();

  // 启动浏览器
  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage();
  page.setDefaultTimeout(ACTION_TIMEOUT);

  console.error(`正在打开 ${PAGE_URL} ...`);
  await page.goto(PAGE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 隐藏导航栏 + 设置固定取样时刻
  await hideNavBar(page);
  await setSamplingTime(page);

  // 逐市抓取
  let done = 0;
  let skipped = 0;
  const failed: { province: string; city: string; error: string }[] = [];

  for (let i = 0; i < total; i++) {
    const { province, city } = cityList[i]!;
    const key = `${province}|${city}`;

    // 断点续跑：跳过已抓取的城市
    if (results.has(key)) {
      skipped++;
      continue;
    }

    done++;
    const progress = `[${done}/${total - skipped}]`;

    let success = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.error(`${progress} ${province}/${city}（第 ${attempt} 次尝试）...`);
        const { longitude, trueSolarTime } = await selectCityAndScrape(page, province, city);
        results.set(key, { province, city, longitude, trueSolarTime });
        console.error(`${progress} ${province}/${city} -> lng=${longitude}, tst=${trueSolarTime}`);
        success = true;
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${progress} ${province}/${city} 第 ${attempt} 次失败：${msg}`);
        if (attempt < MAX_RETRIES) {
          await page.goto(PAGE_URL, { waitUntil: "networkidle" });
          await page.waitForTimeout(2000);
          await hideNavBar(page);
          await setSamplingTime(page);
        }
      }
    }

    if (!success) {
      failed.push({ province, city, error: `${MAX_RETRIES} 次重试后仍失败` });
      console.error(`${progress} ${province}/${city} 放弃（${MAX_RETRIES} 次重试后仍失败）`);
    }

    // 每省结束后增量保存
    const nextCity = cityList[i + 1];
    if (!nextCity || nextCity.province !== province) {
      saveOutput(results);
      console.error(`已保存 ${results.size} 条结果到 ${OUTPUT_FILE}`);
    }

    // 间隔延迟
    if (i < total - 1) {
      await page.waitForTimeout(INTER_CITY_DELAY_MS);
    }
  }

  // 最终保存
  saveOutput(results);

  // 报告
  console.error(`\n完成：成功 ${results.size}，跳过 ${skipped}，失败 ${failed.length}。`);
  if (failed.length > 0) {
    console.error("\n失败城市：");
    for (const f of failed) {
      console.error(`  ${f.province}/${f.city}：${f.error}`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error("致命错误：", err);
  process.exit(1);
});
