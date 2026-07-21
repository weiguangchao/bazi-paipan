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
    // 干支为 2 字；T10 起四柱行带十神括注，故只取"时柱："后头 2 字。
    const pick = (s: string) => /时柱：(..)/.exec(s)?.[1] ?? "";
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
    // 8 柱干支 + 十神括注 + 起运岁/年月（T11 起大运柱带十神括注）
    expect(stdout).toMatch(/第1柱 庚辰（庚·正财；辰·戊伤官 乙偏印 癸七杀）（8岁6月起；2008年9月）/);
    expect(stdout).toMatch(/第8柱 丁亥（丁·比肩；亥·壬正官 甲正印）（78岁6月起；2078年9月）/);
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
    expect(stdout).toMatch(/第1柱 戊寅（戊·伤官；寅·甲正印 丙劫财 戊伤官）（1岁6月起；2001年9月）/);
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

describe("CLI - 四柱带十神 (T10)", () => {
  // 定点出生时刻 2000-01-01 12:00 钟表时：年柱 己卯、月柱 丙子、日柱 戊午、时柱 戊午
  // （见 paipan.test.ts T4 完整四柱命例）。日主取日柱天干戊。
  // 干支可写死；十神按 src/shishen.ts 规则算出后写死断言，防回归。
  //   戊日主：己劫财、丙偏印、戊比肩；卯乙正官、子癸正财、午丁正印 己劫财。
  it("四柱每柱带十神括注，干·十神、支·藏干十神，日干位标日主", () => {
    const { stdout, exit } = runCli(["-y", "2000", "-m", "1", "-d", "1", "-H", "12", "-M", "0"]);
    expect(exit).toBe(0);
    expect(stdout).toContain("年柱：己卯（己·劫财；卯·乙正官）");
    expect(stdout).toContain("月柱：丙子（丙·偏印；子·癸正财）");
    expect(stdout).toContain("日柱：戊午（戊·日主；午·丁正印 己劫财）");
    expect(stdout).toContain("时柱：戊午（戊·比肩；午·丁正印 己劫财）");
  });

  // 日干位标"日主"，不调十神规则（戊日主本应为比肩，日柱天干位写"日主"而非"比肩"）。
  it("日柱天干位标日主，不是比肩", () => {
    const { stdout, exit } = runCli(["-y", "2000", "-m", "1", "-d", "1", "-H", "12", "-M", "0"]);
    expect(exit).toBe(0);
    expect(stdout).toContain("日柱：戊午（戊·日主；");
    expect(stdout).not.toMatch(/日柱：戊午（戊·比肩/);
  });

  // 经度修正后时柱变化时，十神括注随之更新（喀什真太阳时丁巳）。
  // 丁巳：丁正印；巳藏丙戊庚 -> 丙偏印 戊比肩 庚食神。
  it("喀什经度修正 -> 时柱 丁巳 带对应十神括注", () => {
    const { stdout, exit } = runCli([
      "-y", "2000", "-m", "1", "-d", "1", "-H", "12", "-M", "0",
      "-p", "新疆维吾尔自治区", "-c", "喀什地区",
    ]);
    expect(exit).toBe(0);
    expect(stdout).toContain("时柱：丁巳（丁·正印；巳·丙偏印 戊比肩 庚食神）");
  });
});

describe("CLI - 大运带十神 (T11)", () => {
  // 定点出生时刻 2000-03-10 12:00 钟表时：日柱 丁卯，日主 丁。
  // 大运柱天干十神与地支藏干十神都相对同一日主丁（CONTEXT.md：日主）。
  // 大运柱结构不变；十神由组合层用 #10 的 十神() 叠加（src/shishen.ts）。
  // 顺行 8 柱：庚辰、辛巳、壬午、癸未、甲申、乙酉、丙戌、丁亥。
  it("顺行男命大运 8 柱每柱带十神括注（天干十神 + 藏干十神）", () => {
    const { stdout, exit } = runCli([
      "-y", "2000", "-m", "3", "-d", "10", "-H", "12", "-M", "0", "-g", "男",
    ]);
    expect(exit).toBe(0);
    expect(stdout).toContain("第1柱 庚辰（庚·正财；辰·戊伤官 乙偏印 癸七杀）（8岁6月起；2008年9月）");
    expect(stdout).toContain("第2柱 辛巳（辛·偏财；巳·丙劫财 戊伤官 庚正财）（18岁6月起；2018年9月）");
    expect(stdout).toContain("第3柱 壬午（壬·正官；午·丁比肩 己食神）（28岁6月起；2028年9月）");
    expect(stdout).toContain("第4柱 癸未（癸·七杀；未·己食神 丁比肩 乙偏印）（38岁6月起；2038年9月）");
    expect(stdout).toContain("第5柱 甲申（甲·正印；申·庚正财 壬正官 戊伤官）（48岁6月起；2048年9月）");
    expect(stdout).toContain("第6柱 乙酉（乙·偏印；酉·辛偏财）（58岁6月起；2058年9月）");
    expect(stdout).toContain("第7柱 丙戌（丙·劫财；戌·戊伤官 辛偏财 丁比肩）（68岁6月起；2068年9月）");
    expect(stdout).toContain("第8柱 丁亥（丁·比肩；亥·壬正官 甲正印）（78岁6月起；2078年9月）");
  });

  // 逆行 8 柱：戊寅、丁丑、丙子、乙亥、甲戌、癸酉、壬申、辛未。
  it("逆行女命大运 8 柱每柱带十神括注（天干十神 + 藏干十神）", () => {
    const { stdout, exit } = runCli([
      "-y", "2000", "-m", "3", "-d", "10", "-H", "12", "-M", "0", "-g", "女",
    ]);
    expect(exit).toBe(0);
    expect(stdout).toContain("第1柱 戊寅（戊·伤官；寅·甲正印 丙劫财 戊伤官）（1岁6月起；2001年9月）");
    expect(stdout).toContain("第2柱 丁丑（丁·比肩；丑·己食神 癸七杀 辛偏财）（11岁6月起；2011年9月）");
    expect(stdout).toContain("第3柱 丙子（丙·劫财；子·癸七杀）（21岁6月起；2021年9月）");
    expect(stdout).toContain("第4柱 乙亥（乙·偏印；亥·壬正官 甲正印）（31岁6月起；2031年9月）");
    expect(stdout).toContain("第5柱 甲戌（甲·正印；戌·戊伤官 辛偏财 丁比肩）（41岁6月起；2041年9月）");
    expect(stdout).toContain("第6柱 癸酉（癸·七杀；酉·辛偏财）（51岁6月起；2051年9月）");
    expect(stdout).toContain("第7柱 壬申（壬·正官；申·庚正财 壬正官 戊伤官）（61岁6月起；2061年9月）");
    expect(stdout).toContain("第8柱 辛未（辛·偏财；未·己食神 丁比肩 乙偏印）（71岁6月起；2071年9月）");
  });

  // 起运岁、起运年月信息保留不丢：十神括注插入后，起运岁与起运年月仍完整可读。
  it("大运柱十神括注不破坏起运岁与起运年月信息", () => {
    const { stdout, exit } = runCli([
      "-y", "2000", "-m", "3", "-d", "10", "-H", "12", "-M", "0", "-g", "男",
    ]);
    expect(exit).toBe(0);
    // 起运岁行标题保留
    expect(stdout).toMatch(/大运（顺行；起运 8岁6月）：/);
    // 末柱起运岁与起运年月仍完整
    expect(stdout).toMatch(/丁·比肩；亥·壬正官 甲正印）（78岁6月起；2078年9月）/);
  });
});