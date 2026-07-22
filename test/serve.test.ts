import { describe, it, expect, afterEach } from "vitest";
import { serve } from "../src/serve.js";
import type { PaipanServer } from "../src/http-server.js";
import net from "node:net";

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

describe("serve - command自动化", () => {
  // 验收：默认端口 3000、支持 --port、仅监听 127.0.0.1
  it("默认端口 3000", async () => {
    const s = await serve({ onReady: () => {} });
    servers.push(s);
    expect(s.port).toBe(3000);
    expect(s.host).toBe("127.0.0.1");
    await cleanup(s);
  });

  it("--port 覆盖端口", async () => {
    const s = await serve({ port: 3999, onReady: () => {} });
    servers.push(s);
    expect(s.port).toBe(3999);
    await cleanup(s);
  });

  it("仅监听 127.0.0.1，非 0.0.0.0", async () => {
    const s = await serve({ port: 3888, onReady: () => {} });
    servers.push(s);
    expect(s.host).toBe("127.0.0.1");
    await cleanup(s);
  });

  // 验收：端口被占用时明确失败
  it("端口被占用时明确失败", async () => {
    const occupier = await getOccupier(3555);
    try {
    await expect(serve({ port: 3555, onReady: () => {} })).rejects.toThrow(/已被占用/);
    } finally {
      await occupier.close();
    }
  });

  // 验收：服务成功启动后触发浏览器打开意图并输出本机地址（mock 验证）
  it("onReady 回调触发浏览器打开意图并输出地址", async () => {
    let openedUrl = "";
    const s = await serve({ port: 3777, onReady: (url) => { openedUrl = url; } });
    servers.push(s);
    expect(openedUrl).toBe("http://127.0.0.1:3777");
    await cleanup(s);
  });

  // 验收：Ctrl-C 可关闭监听器（模拟 SIGINT 处理在 index.ts，这里测 close() 干净关闭）
  it("close() 干净关闭监听器", async () => {
    const s = await serve({ port: 3666, onReady: () => {} });
    await s.close();
    // 关闭后端口应可复用
    const s2 = await serve({ port: 3666, onReady: () => {} });
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
