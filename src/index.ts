#!/usr/bin/env node
// 八字排盘 CLI 入口
// 用法：bazi serve [--port <端口>]
// 无子命令时显示帮助。

import { Command } from "commander";
import { serve } from "./serve.js";
import { spawn } from "node:child_process";

const program = new Command();

program
  .name("bazi")
  .description("八字排盘 - 本机 Web 排盘服务")
  .version("0.1.0");

program
  .command("serve")
  .description("启动本机 Web 排盘服务（仅监听 127.0.0.1）")
  .option("-p, --port <port>", "端口（默认 3000）", "3000")
  .action(async (opts: { port: string }) => {
    const port = parseInt(opts.port, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.error("错误：--port 须为 1-65535 的整数");
      process.exit(1);
    }
    try {
      const server = await serve({
        port,
        onReady: (url) => openBrowser(url),
      });
      // Ctrl-C 干净关闭
      process.on("SIGINT", () => {
        server.close().then(() => process.exit(0));
      });
      process.on("SIGTERM", () => {
        server.close().then(() => process.exit(0));
      });
    } catch (e) {
      console.error("错误：" + (e instanceof Error ? e.message : String(e)));
      process.exit(1);
    }
  });

// 无子命令时显示帮助
if (process.argv.slice(2).length === 0) {
  program.help();
}

program.parse(process.argv);

/**
 * 打开浏览器（跨平台 best-effort，失败不影响服务）。
 */
function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;
  let args: string[];
  if (platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  try {
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
  } catch {
    // 打开失败不影响服务运行
  }
}
