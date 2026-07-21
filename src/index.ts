#!/usr/bin/env node
// 八字排盘 CLI 入口
// T5：接收公历年月日 + 时分（钟表时），可选出生地（省/地级市）。
// 给出出生地时按经度修正为真太阳时排盘；未给出时走钟表时并打印真太阳时偏移提示。

import { Command } from "commander";
import { 排盘 } from "./paipan.js";
import { 流年 } from "./liunian.js";
import { getBeijingYear } from "./beijing-time.js";
import type { 性别 } from "./dayun.js";

const program = new Command();

program
  .name("bazi")
  .description("八字排盘 CLI - 输入出生年月日时，算出四柱八字与大运")
  .version("0.1.0")
  .requiredOption("-y, --year <year>", "出生年（公历）", (v) => parseInt(v, 10))
  .requiredOption("-m, --month <month>", "出生月（公历 1-12）", (v) => parseInt(v, 10))
  .requiredOption("-d, --day <day>", "出生日（公历）", (v) => parseInt(v, 10))
  .requiredOption("-H, --hour <hour>", "出生时（0-23）", (v) => parseInt(v, 10))
  .requiredOption("-M, --minute <minute>", "出生分（0-59）", (v) => parseInt(v, 10))
  .option("-p, --province <province>", "出生省（全名，如 四川省；与 --city 同时给出时按经度修正为真太阳时）")
  .option("-c, --city <city>", "出生地级市（全名，如 成都市；与 --province 同时给出）")
  .option("-g, --gender <gender>", "性别（男/女）；给出时排大运（8 柱）")
  .action((opts: {
    year: number; month: number; day: number; hour: number; minute: number;
    province?: string; city?: string; gender?: string;
  }) => {
    // 输入合法性校验
    if (Number.isNaN(opts.year) || Number.isNaN(opts.month) ||
        Number.isNaN(opts.day) || Number.isNaN(opts.hour) ||
        Number.isNaN(opts.minute)) {
      console.error("错误：年月日时分须为数字");
      process.exit(1);
    }
    if (opts.month < 1 || opts.month > 12) {
      console.error(`错误：月份须在 1-12，收到 ${opts.month}`);
      process.exit(1);
    }
    if (opts.hour < 0 || opts.hour > 23) {
      console.error(`错误：小时须在 0-23，收到 ${opts.hour}`);
      process.exit(1);
    }
    if (opts.minute < 0 || opts.minute > 59) {
      console.error(`错误：分钟须在 0-59，收到 ${opts.minute}`);
      process.exit(1);
    }
    // 日期合法性（让 Date 兜底：本题只校验日 ≠ 00 与基本边界）
    if (opts.day < 1 || opts.day > 31) {
      console.error(`错误：日须在 1-31，收到 ${opts.day}`);
      process.exit(1);
    }

    // 出生地：省/市必须同时给出或同时缺省。
    const hasProv = opts.province !== undefined && opts.province !== "";
    const hasCity = opts.city !== undefined && opts.city !== "";
    if (hasProv !== hasCity) {
      console.error("错误：--province 与 --city 必须同时给出或同时省略");
      process.exit(1);
    }
    const birthplace = hasProv && hasCity
      ? { province: opts.province!, city: opts.city! }
      : undefined;

    // 性别：仅接受 男/女。给出时排大运，省略时不算大运。
    let gender: 性别 | undefined;
    if (opts.gender !== undefined) {
      if (opts.gender !== "男" && opts.gender !== "女") {
        console.error(`错误：--gender 须为 男 或 女，收到 ${opts.gender}`);
        process.exit(1);
      }
      gender = opts.gender;
    }

    let result;
    try {
      result = 排盘({ year: opts.year, month: opts.month, day: opts.day, hour: opts.hour, minute: opts.minute, birthplace, gender });
    } catch (e) {
      // 经度修正查不到出生地时，排盘抛 RangeError，转友好提示。
      if (e instanceof RangeError) {
        console.error(`错误：${e.message}`);
        process.exit(1);
      }
      throw e;
    }

    console.log(`年柱：${result.年柱}`);
    console.log(`月柱：${result.月柱}`);
    console.log(`日柱：${result.日柱}`);
    console.log(`时柱：${result.时柱}`);
    if (result.近子正) {
      // 早晚子时跨界提示：子正（00:00）为日柱切换点，近子正时刻稍有出入即影响四柱
      console.log("提示：出生时刻近子正（00:00），已按早晚子时归属日柱与时柱；若实际时刻略有出入，排盘结果可能不同。");
    }
    if (!result.经度修正) {
      // 未做经度修正：真太阳时与钟表时可能存在数分钟到数十分钟偏差，影响时柱乃至日柱。
      console.log("提示：未做经度修正，真太阳时可能偏移。给出 --province/--city 可按出生地经度修正为真太阳时。");
    }
    if (result.大运) {
      // 大运：方向 + 起运岁 + 8 柱。每柱管 10 年，干支从月柱顺/逆推出。
      const { 方向, 起运岁, 柱 } = result.大运;
      console.log(`大运（${方向}行；起运 ${起运岁.岁}岁${起运岁.月}月）：`);
      for (const p of 柱) {
        console.log(
          `  第${p.序号 + 1}柱 ${p.干支}（${p.起运岁.岁}岁${p.起运岁.月}月起；${p.起年月.year}年${p.起年月.month}月）`,
        );
      }
    }

    // 流年：必选输出。今年公历年由 CLI 边缘按北京时间（UTC+8）读机器时钟算出，
    // 再调流年纯函数（ADR-0003）--排盘核心不读时钟。
    const 今年 = getBeijingYear();
    const 流年柱 = 流年(今年);
    console.log(`流年（今年 ${今年} 起，10 柱）：`);
    for (const p of 流年柱) {
      console.log(`  ${p.年} ${p.干支}`);
    }
  });

program.parse(process.argv);
