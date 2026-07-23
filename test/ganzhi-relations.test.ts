import { describe, expect, it } from "vitest";
import {
  ganzhiRelations,
  type GanzhiRelationsInput,
  type GanzhiRelationItem,
} from "../src/ganzhi-relations.js";
import {
  ganzhiDizhi,
  ganzhiTiangan,
  liushijiazi,
  type Dizhi,
  type Ganzhi,
  type Tiangan,
} from "../src/ganzhi.js";

const allGanzhi = Array.from({ length: 60 }, (_, index) => liushijiazi(index));

function ganzhiForTiangan(value: Tiangan): Ganzhi {
  return allGanzhi.find((ganzhi) => ganzhiTiangan(ganzhi) === value)!;
}

function ganzhiForDizhi(value: Dizhi): Ganzhi {
  return allGanzhi.find((ganzhi) => ganzhiDizhi(ganzhi) === value)!;
}

function inputFrom(values: readonly Ganzhi[]): GanzhiRelationsInput {
  const filled = [...values];
  while (filled.length < 4) filled.push(values[0]!);
  return {
    nianzhu: filled[0]!,
    yuezhu: filled[1]!,
    rizhu: filled[2]!,
    shizhu: filled[3]!,
  };
}

const tianganxiangkeCases = [
  ["甲", "戊"], ["甲", "己"], ["乙", "戊"], ["乙", "己"],
  ["戊", "壬"], ["戊", "癸"], ["己", "壬"], ["己", "癸"],
  ["壬", "丙"], ["壬", "丁"], ["癸", "丙"], ["癸", "丁"],
  ["丙", "庚"], ["丙", "辛"], ["丁", "庚"], ["丁", "辛"],
  ["庚", "甲"], ["庚", "乙"], ["辛", "甲"], ["辛", "乙"],
] as const satisfies readonly (readonly [Tiangan, Tiangan])[];

const tianganwuheCases = [
  ["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"],
] as const satisfies readonly (readonly [Tiangan, Tiangan])[];

const dizhiliuchongCases = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
] as const satisfies readonly (readonly [Dizhi, Dizhi])[];

const dizhiliuheCases = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
] as const satisfies readonly (readonly [Dizhi, Dizhi])[];

const dizhisanheCases = [
  ["申", "子", "辰"], ["亥", "卯", "未"], ["寅", "午", "戌"], ["巳", "酉", "丑"],
] as const satisfies readonly (readonly [Dizhi, Dizhi, Dizhi])[];

const dizhibansanheCases = [
  ["申", "子"], ["子", "辰"], ["申", "辰"],
  ["亥", "卯"], ["卯", "未"], ["亥", "未"],
  ["寅", "午"], ["午", "戌"], ["寅", "戌"],
  ["巳", "酉"], ["酉", "丑"], ["巳", "丑"],
] as const satisfies readonly (readonly [Dizhi, Dizhi])[];

function binaryItem(
  type: GanzhiRelationItem["type"],
  members: readonly [Tiangan, Tiangan] | readonly [Dizhi, Dizhi],
  suffix: string,
): GanzhiRelationItem {
  return { type, members, text: members.join("") + suffix };
}

describe("干支关系 - 53 项规范关系", () => {
  it.each(tianganxiangkeCases)("%s克%s", (first, second) => {
    const result = ganzhiRelations(inputFrom([
      ganzhiForTiangan(first),
      ganzhiForTiangan(second),
    ]));
    const expectedTianganxiangke = {
      type: "tianganxiangke",
      members: [first, second],
      text: `${first}克${second}`,
    };
    const matchedTianganwuhe = tianganwuheCases.find(
      ([left, right]) =>
        (left === first && right === second) || (left === second && right === first),
    );
    if (matchedTianganwuhe) {
      expect(result.tiangan).not.toContainEqual(expectedTianganxiangke);
      expect(result.tiangan).toEqual([
        binaryItem("tianganwuhe", matchedTianganwuhe, "合"),
      ]);
    } else {
      expect(result.tiangan).toEqual([expectedTianganxiangke]);
    }
  });

  it.each(tianganwuheCases)("%s%s合且排除同对相克", (first, second) => {
    const result = ganzhiRelations(inputFrom([
      ganzhiForTiangan(first),
      ganzhiForTiangan(second),
    ]));
    expect(result.tiangan).toEqual([
      binaryItem("tianganwuhe", [first, second], "合"),
    ]);
  });

  it.each(dizhiliuchongCases)("%s%s冲", (first, second) => {
    const result = ganzhiRelations(inputFrom([
      ganzhiForDizhi(first),
      ganzhiForDizhi(second),
    ]));
    expect(result.dizhi).toEqual([
      binaryItem("dizhiliuchong", [first, second], "冲"),
    ]);
  });

  it.each(dizhiliuheCases)("%s%s合", (first, second) => {
    const result = ganzhiRelations(inputFrom([
      ganzhiForDizhi(first),
      ganzhiForDizhi(second),
    ]));
    expect(result.dizhi).toEqual([
      binaryItem("dizhiliuhe", [first, second], "合"),
    ]);
  });

  it.each(dizhisanheCases)("%s%s%s三合且排除内部半三合", (first, second, third) => {
    const result = ganzhiRelations(inputFrom([
      ganzhiForDizhi(first),
      ganzhiForDizhi(second),
      ganzhiForDizhi(third),
    ]));
    expect(result.dizhi).toEqual([{
      type: "dizhisanhe",
      members: [first, second, third],
      text: `${first}${second}${third}三合`,
    }]);
  });

  it.each(dizhibansanheCases)("%s%s半三合", (first, second) => {
    const result = ganzhiRelations(inputFrom([
      ganzhiForDizhi(first),
      ganzhiForDizhi(second),
    ]));
    expect(result.dizhi).toEqual([
      binaryItem("dizhibansanhe", [first, second], "半三合"),
    ]);
  });
});

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, candidateIndex) => candidateIndex !== index))
      .map((rest) => [value, ...rest]),
  );
}

describe("干支关系 - 聚合、互斥与稳定排序", () => {
  it("密集命例全部 24 种柱位排列结果一致", () => {
    const expected = {
      tiangan: [
        { type: "tianganxiangke", members: ["己", "壬"], text: "己克壬" },
        { type: "tianganxiangke", members: ["庚", "甲"], text: "庚克甲" },
        { type: "tianganwuhe", members: ["甲", "己"], text: "甲己合" },
      ],
      dizhi: [
        { type: "dizhiliuhe", members: ["辰", "酉"], text: "辰酉合" },
        { type: "dizhisanhe", members: ["申", "子", "辰"], text: "申子辰三合" },
      ],
    };

    const assignments = permutations(["甲申", "庚子", "壬辰", "己酉"] as const);
    expect(assignments).toHaveLength(24);
    for (const assignment of assignments) {
      expect(ganzhiRelations(inputFrom(assignment))).toEqual(expected);
    }
  });

  it("重复天干只输出一个关系", () => {
    expect(ganzhiRelations(inputFrom(["甲子", "己丑", "甲寅", "己卯"])).tiangan)
      .toEqual([{ type: "tianganwuhe", members: ["甲", "己"], text: "甲己合" }]);
  });

  it("重复地支只输出一个关系", () => {
    expect(ganzhiRelations(inputFrom(["甲子", "乙丑", "丙子", "丁丑"])).dizhi)
      .toEqual([{ type: "dizhiliuhe", members: ["子", "丑"], text: "子丑合" }]);
  });

  it("四柱全同不形成自身关系", () => {
    expect(ganzhiRelations(inputFrom(["甲子"]))).toEqual({ tiangan: [], dizhi: [] });
  });

  it("不同干支但无命中返回两个空数组", () => {
    expect(ganzhiRelations(inputFrom(["甲子", "丙寅", "丁卯", "乙巳"])))
      .toEqual({ tiangan: [], dizhi: [] });
  });
});

describe("干支关系 - 命名四柱校验", () => {
  const valid: GanzhiRelationsInput = {
    nianzhu: "甲子",
    yuezhu: "丙寅",
    rizhu: "丁卯",
    shizhu: "乙巳",
  };

  for (const field of ["nianzhu", "yuezhu", "rizhu", "shizhu"] as const) {
    it(`${field} 非法时 RangeError 同时报告字段和值`, () => {
      const input = { ...valid, [field]: "甲丑" } as unknown as GanzhiRelationsInput;
      expect(() => ganzhiRelations(input)).toThrow(RangeError);
      expect(() => ganzhiRelations(input)).toThrow(field);
      expect(() => ganzhiRelations(input)).toThrow("甲丑");
    });
  }
});
