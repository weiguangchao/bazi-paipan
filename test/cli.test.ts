import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CLI = fileURLToPath(new URL("../src/index.ts", import.meta.url));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 用 tsx 跑 src/index.ts，避免依赖 build 产物。
function runCli(args: string[]): { stdout: string; stderr: string; exit: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", CLI, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "", exit: 0 };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      exit: err.status ?? 1,
    };
  }
}

describe("CLI - 真太阳时与经度修正提示 (T5)", () => {
  // 验收：未给地名时走钟表时并打印"未做经度修正，真太阳时可能偏移"提示。
  it("未给地名 -> 打印四柱并提示未做经度修正", () => {
    const { stdout, exit } = runCli(["-y", "2000", "-m", "1", "-d", "1", "-H", "12", "-M", "0"]);
    expect(exit).toBe(0);
    expect(stdout).toContain("年柱：己卯");
    expect(stdout).toContain("时柱：戊午");
    expect(stdout).toMatch(/未做经度修正，真太阳时可能偏移/);
  });

  // 验收：给出地名时按经度修正排盘，不再打印"未做经度修正"提示。
  it("给出喀什地名 -> 时柱按真太阳时为丁巳，不打印未做经度修正提示", () => {
    const { stdout, exit } = runCli([
      "-y", "2000", "-m", "1", "-d", "1", "-H", "12", "-M", "0",
      "-p", "新疆维吾尔自治区", "-c", "喀什地区",
    ]);
    expect(exit).toBe(0);
    expect(stdout).toContain("时柱：丁巳");
    expect(stdout).not.toMatch(/未做经度修正/);
  });

  // 验收：同一出生时刻给/不给地名时柱不同。CLI 层对照。
  it("给/不给喀什地名 -> CLI 时柱不同", () => {
    const 钟表 = runCli(["-y", "2000", "-m", "1", "-d", "1", "-H", "12", "-M", "0"]).stdout;
    const 真太阳 = runCli([
      "-y", "2000", "-m", "1", "-d", "1", "-H", "12", "-M", "0",
      "-p", "新疆维吾尔自治区", "-c", "喀什地区",
    ]).stdout;
    const pick = (s: string) => /时柱：(.+)/.exec(s)?.[1] ?? "";
    expect(pick(钟表)).toBe("戊午");
    expect(pick(真太阳)).toBe("丁巳");
  });

  it("只给 --province 不给 --city -> 报错并退出码 1", () => {
    const { stderr, exit } = runCli(["-y", "2000", "-m", "1", "-d", "1", "-H", "12", "-M", "0", "-p", "四川省"]);
    expect(exit).toBe(1);
    expect(stderr).toMatch(/必须同时给出或同时省略/);
  });

  it("给出未知城市 -> 友好报错并退出码 1", () => {
    const { stderr, exit } = runCli([
      "-y", "2000", "-m", "1", "-d", "1", "-H", "12", "-M", "0",
      "-p", "四川省", "-c", "不存在的市",
    ]);
    expect(exit).toBe(1);
    expect(stderr).toMatch(/未知出生地/);
  });
});