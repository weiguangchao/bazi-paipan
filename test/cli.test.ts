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

describe("CLI - 大运 (T6)", () => {
  // 验收：CLI 接受 --gender，打印 8 柱大运（含起运年月、起运岁、干支）。
  it("阳年男 2000-03-10 12:00 -> 打印顺行 8 柱大运，含方向与起运岁", () => {
    const { stdout, exit } = runCli([
      "-y", "2000", "-m", "3", "-d", "10", "-H", "12", "-M", "0", "-g", "男",
    ]);
    expect(exit).toBe(0);
    expect(stdout).toMatch(/大运（顺行；起运 8岁6月）：/);
    // 8 柱干支
    expect(stdout).toMatch(/第1柱 庚辰（8岁6月起；2008年9月）/);
    expect(stdout).toMatch(/第8柱 丁亥（78岁6月起；2078年9月）/);
    // 共 8 行
    const 柱行 = stdout.split("\n").filter((l) => /第\d柱/.test(l));
    expect(柱行).toHaveLength(8);
  });

  it("阳年女 2000-03-10 12:00 -> 打印逆行大运，第 1 柱戊寅起 1岁6月", () => {
    const { stdout, exit } = runCli([
      "-y", "2000", "-m", "3", "-d", "10", "-H", "12", "-M", "0", "-g", "女",
    ]);
    expect(exit).toBe(0);
    expect(stdout).toMatch(/大运（逆行；起运 1岁6月）：/);
    expect(stdout).toMatch(/第1柱 戊寅（1岁6月起；2001年9月）/);
  });

  it("未给 --gender -> 不打印大运", () => {
    const { stdout, exit } = runCli([
      "-y", "2000", "-m", "3", "-d", "10", "-H", "12", "-M", "0",
    ]);
    expect(exit).toBe(0);
    expect(stdout).not.toMatch(/大运/);
  });

  it("非法 --gender -> 报错并退出码 1", () => {
    const { stderr, exit } = runCli([
      "-y", "2000", "-m", "3", "-d", "10", "-H", "12", "-M", "0", "-g", "other",
    ]);
    expect(exit).toBe(1);
    expect(stderr).toMatch(/--gender 须为 男 或 女/);
  });
});

describe("CLI - 流年 (T9)", () => {
  // 流年块为必选输出，无 flag 触发。具体干支由 liunian.test.ts 纯函数测保证；
  // CLI 测试只用正则断言占位行 + 10 行格式，避免写死具体干支造成的跨年时间炸弹。
  it("默认打印流年块：标题行 + 10 行 '<year> <干支>'", () => {
    const { stdout, exit } = runCli(["-y", "2000", "-m", "1", "-d", "1", "-H", "12", "-M", "0"]);
    expect(exit).toBe(0);
    // 标题行：流年（今年 <year> 起，10 柱）：
    expect(stdout).toMatch(/^流年（今年 \d+ 起，10 柱）：$/m);
    // 10 行：两空格缩进 + 年份 + 空格 + 两字干支
    const 流年行 = stdout
      .split("\n")
      .filter((l) => /^\s+\d+ [甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(l));
    expect(流年行).toHaveLength(10);
    // 第一行的年份与标题行的"今年"一致
    const titleYear = /流年（今年 (\d+) 起/.exec(stdout)?.[1];
    const firstYear = /^\s+(\d+) /.exec(流年行[0]!)?.[1];
    expect(firstYear).toBe(titleYear);
    // 10 行年份依次 +1
    const years = 流年行.map((l) => Number(/^\s+(\d+) /.exec(l)?.[1]));
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBe(years[i - 1]! + 1);
    }
  });

  // 给 --gender 也应打印流年（流年不依赖大运/性别，始终输出）。
  it("给出 --gender 时仍打印流年块", () => {
    const { stdout, exit } = runCli([
      "-y", "2000", "-m", "3", "-d", "10", "-H", "12", "-M", "0", "-g", "男",
    ]);
    expect(exit).toBe(0);
    expect(stdout).toMatch(/流年（今年 \d+ 起，10 柱）：/);
  });
});