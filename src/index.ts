#!/usr/bin/env node
// 八字排盘 CLI 入口
// T1：接收公历年月日 + 时分，打印日柱

import { Command } from "commander";
import { 排盘 } from "./paipan.js";

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
  .action((opts: {
    year: number; month: number; day: number; hour: number; minute: number;
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

    const result = 排盘(opts);
    console.log(`日柱：${result.日柱}`);
  });

program.parse(process.argv);