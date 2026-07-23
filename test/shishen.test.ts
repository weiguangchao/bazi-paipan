import { describe, it, expect } from "vitest";
import { shishen, cangganTable } from "../src/shishen.js";
import { dizhi, type Dizhi, type Tiangan } from "../src/ganzhi.js";

// 十神纯函数：对日主 + 任意干支返回 { 天干十神, 藏干十神[] }。
// 五行：甲乙木、丙丁火、戊己土、庚辛金、壬癸水；阴阳按天干序号偶阳奇阴。
// 关系：同五行->比肩/劫财、我生->食神/伤官、我克->偏财/正财、克我->七杀/正官、
//       生我->偏印/正印。同阴阳取前者、异阴阳取后者。

describe("十神 - 规则穷举 10 种十神（日主=戊，阳土）", () => {
  // 日主戊（土，阳，序号 4）。10 种十神以戊为日主逐一命中：
  //   比肩=戊、劫财=己、食神=庚、伤官=辛、偏财=壬、正财=癸、
  //   七杀=甲、正官=乙、偏印=丙、正印=丁。
  const dayMaster = "戊";

  it("比肩：戊（同五行、同阴阳）-> 比肩", () => {
    expect(shishen(dayMaster, "戊子").tianganShishen).toBe("比肩");
  });

  it("劫财：己（同五行、异阴阳）-> 劫财", () => {
    expect(shishen(dayMaster, "己丑").tianganShishen).toBe("劫财");
  });

  it("食神：庚（我生金、同阴阳）-> 食神", () => {
    expect(shishen(dayMaster, "庚辰").tianganShishen).toBe("食神");
  });

  it("伤官：辛（我生金、异阴阳）-> 伤官", () => {
    expect(shishen(dayMaster, "辛未").tianganShishen).toBe("伤官");
  });

  it("偏财：壬（我克水、同阴阳）-> 偏财", () => {
    expect(shishen(dayMaster, "壬戌").tianganShishen).toBe("偏财");
  });

  it("正财：癸（我克水、异阴阳）-> 正财", () => {
    expect(shishen(dayMaster, "癸亥").tianganShishen).toBe("正财");
  });

  it("七杀：甲（克我木、同阴阳）-> 七杀", () => {
    expect(shishen(dayMaster, "甲寅").tianganShishen).toBe("七杀");
  });

  it("正官：乙（克我木、异阴阳）-> 正官", () => {
    expect(shishen(dayMaster, "乙卯").tianganShishen).toBe("正官");
  });

  it("偏印：丙（生我火、同阴阳）-> 偏印", () => {
    expect(shishen(dayMaster, "丙子").tianganShishen).toBe("偏印");
  });

  it("正印：丁（生我火、异阴阳）-> 正印", () => {
    expect(shishen(dayMaster, "丁丑").tianganShishen).toBe("正印");
  });
});

describe("十神 - 藏干十神（日主=戊，阳土）", () => {
  // 验证藏干十神随藏干逐个相对日主计十神，且与藏干顺序一致。
  // 辰藏 戊乙癸 -> 戊比肩、乙正官、癸正财（与 issue 示例一致）。
  const dayMaster = "戊";

  it("辰藏 戊乙癸 -> 比肩、正官、正财", () => {
    const r = shishen(dayMaster, "庚辰");
    expect(r.cangganShishen).toEqual(["比肩", "正官", "正财"]);
  });

  it("午藏 丁己 -> 正印、劫财", () => {
    const r = shishen(dayMaster, "戊午");
    expect(r.cangganShishen).toEqual(["正印", "劫财"]);
  });

  it("卯藏 乙 -> 正官（单藏干）", () => {
    const r = shishen(dayMaster, "己卯");
    expect(r.cangganShishen).toEqual(["正官"]);
  });
});

describe("藏干表 - 12 地支全量覆盖", () => {
  // 锁定藏干表（不标本气/中气/余气）：每个地支藏干数与内容固定。
  // 子癸；丑己癸辛；寅甲丙戊；卯乙；辰戊乙癸；巳丙戊庚；午丁己；
  // 未己丁乙；申庚壬戊；酉辛；戌戊辛丁；亥壬甲。
  const expected: Record<Dizhi, readonly Tiangan[]> = {
    "子": ["癸"],
    "丑": ["己", "癸", "辛"],
    "寅": ["甲", "丙", "戊"],
    "卯": ["乙"],
    "辰": ["戊", "乙", "癸"],
    "巳": ["丙", "戊", "庚"],
    "午": ["丁", "己"],
    "未": ["己", "丁", "乙"],
    "申": ["庚", "壬", "戊"],
    "酉": ["辛"],
    "戌": ["戊", "辛", "丁"],
    "亥": ["壬", "甲"],
  };

  for (const dizhiCharacter of dizhi) {
    const expectedTiangan = expected[dizhiCharacter];
    it(`${dizhiCharacter} -> ${expectedTiangan.join("")}（${expectedTiangan.length} 个藏干）`, () => {
      expect(cangganTable[dizhiCharacter]).toEqual(expectedTiangan);
    });
  }

  it("12 地支全量覆盖（藏干数在 1-3）", () => {
    expect(Object.keys(cangganTable)).toHaveLength(12);
    for (const tiangan of Object.values(cangganTable)) {
      expect(tiangan.length).toBeGreaterThanOrEqual(1);
      expect(tiangan.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("十神 - issue 示例端到端（日主=戊）", () => {
  // 与 issue 中的四柱打印示例完全对应：
  //   年柱 庚辰（庚·食神；辰·戊比肩 乙正官 癸正财）
  //   月柱 己卯（己·劫财；卯·乙正官）
  //   日柱 戊午（戊·日主；午·丁正印 己劫财）  <- 日主位标"日主"是 CLI 层
  //   时柱 戊午（戊·比肩；午·丁正印 己劫财）
  // 日柱纯函数仍返回天干十神=比肩（"日主"标记由 CLI 层叠加，不在此断言）。
  const dayMaster = "戊";

  it("年柱 庚辰 -> 天干食神；藏干 [比肩, 正官, 正财]", () => {
    expect(shishen(dayMaster, "庚辰")).toEqual({
      tianganShishen: "食神",
      cangganShishen: ["比肩", "正官", "正财"],
    });
  });

  it("月柱 己卯 -> 天干劫财；藏干 [正官]", () => {
    expect(shishen(dayMaster, "己卯")).toEqual({
      tianganShishen: "劫财",
      cangganShishen: ["正官"],
    });
  });

  it("时柱 戊午 -> 天干比肩；藏干 [正印, 劫财]（日主标记是 CLI 层）", () => {
    expect(shishen(dayMaster, "戊午")).toEqual({
      tianganShishen: "比肩",
      cangganShishen: ["正印", "劫财"],
    });
  });
});
