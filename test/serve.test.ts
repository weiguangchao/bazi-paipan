import { describe, it, expect, afterEach } from "vitest";
import { serve } from "../src/serve.js";
import type { PaipanServer } from "../src/http-server.js";
import { spawn } from "node:child_process";
import { access, chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const servers: PaipanServer[] = [];

async function cleanup(s: PaipanServer) {
  try { await s.close(); } catch {}
}

afterEach(async () => {
  for (const s of servers.splice(0)) await cleanup(s);
});

function getOccupier(port: number): Promise<{ close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on("error", reject);
    s.listen(port, "127.0.0.1", () => {
      const addr = s.address();
      if (!addr || typeof addr !== "object") return reject(new Error("no addr"));
      resolve({
        close: () => new Promise((r) => s.close(() => r())),
      });
    });
  });
}

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("no address"));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

describe("serve - command自动化", () => {
  // 验收：默认端口 3000、支持 --port、仅监听 127.0.0.1
  it("默认端口 3000", async () => {
    const s = await serve();
    servers.push(s);
    expect(s.port).toBe(3000);
    expect(s.host).toBe("127.0.0.1");
    await cleanup(s);
  });

  it("--port 覆盖端口", async () => {
    const s = await serve({ port: 3999 });
    servers.push(s);
    expect(s.port).toBe(3999);
    await cleanup(s);
  });

  it("仅监听 127.0.0.1，非 0.0.0.0", async () => {
    const s = await serve({ port: 3888 });
    servers.push(s);
    expect(s.host).toBe("127.0.0.1");
    await cleanup(s);
  });

  // 验收：端口被占用时明确失败
  it("端口被占用时明确失败", async () => {
    const occupier = await getOccupier(3555);
    try {
    await expect(serve({ port: 3555 })).rejects.toThrow(/已被占用/);
    } finally {
      await occupier.close();
    }
  });

  it("CLI 启动服务并输出地址，但不主动打开浏览器", async () => {
    const fakeBinDir = await mkdtemp(path.join(os.tmpdir(), "bazi-fake-bin-"));
    const markerPath = path.join(fakeBinDir, "browser-opened");
    const fakeOpener = `#!/bin/sh
: > "$BAZI_BROWSER_OPEN_MARKER"
`;
    await Promise.all(
      ["open", "xdg-open", "cmd"].map(async (command) => {
        const commandPath = path.join(fakeBinDir, command);
        await writeFile(commandPath, fakeOpener);
        await chmod(commandPath, 0o755);
      }),
    );

    const port = await getAvailablePort();
    const cli = spawn(
      process.execPath,
      ["--import", "tsx", "src/index.ts", "serve", "--port", String(port)],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          BAZI_BROWSER_OPEN_MARKER: markerPath,
          PATH: fakeBinDir + path.delimiter + process.env.PATH,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    cli.stdout.setEncoding("utf8");
    cli.stderr.setEncoding("utf8");
    cli.stdout.on("data", (chunk: string) => { stdout += chunk; });
    cli.stderr.on("data", (chunk: string) => { stderr += chunk; });

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("CLI 启动超时\nstdout:\n" + stdout + "\nstderr:\n" + stderr));
        }, 5000);
        const poll = setInterval(() => {
          if (stdout.includes("bazi serve 运行于 http://127.0.0.1:" + port)) {
            clearTimeout(timeout);
            clearInterval(poll);
            resolve();
          }
        }, 10);
        cli.once("exit", (code, signal) => {
          clearTimeout(timeout);
          clearInterval(poll);
          reject(new Error(`CLI 提前退出（code=${code}, signal=${signal}）\n${stderr}`));
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await expect(access(markerPath)).rejects.toThrow();
    } finally {
      cli.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        if (cli.exitCode !== null || cli.signalCode !== null) resolve();
        else cli.once("exit", () => resolve());
      });
      await rm(fakeBinDir, { recursive: true, force: true });
    }
  });

  // 验收：Ctrl-C 可关闭监听器（模拟 SIGINT 处理在 index.ts，这里测 close() 干净关闭）
  it("close() 干净关闭监听器", async () => {
    const s = await serve({ port: 3666 });
    await s.close();
    // 关闭后端口应可复用
    const s2 = await serve({ port: 3666 });
    servers.push(s2);
    expect(s2.port).toBe(3666);
    await cleanup(s2);
  });

  // 验收：无子command显示帮助（通过子进程测试）
  it("无子command显示帮助并退出", async () => {
    const { execSync } = await import("node:child_process");
    const result = execSync("npx tsx src/index.ts", {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 5000,
    });
    expect(result).toMatch(/Usage|usage|Commands|command/);
  });
});
