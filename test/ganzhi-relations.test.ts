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

const dizhixiangxingCases = [
  {
    name: "寅巳申三刑",
    input: ["寅", "巳", "申"],
    expectedDizhi: [
      { type: "dizhiliuchong", members: ["寅", "申"], text: "寅申冲" },
      { type: "dizhiliuhe", members: ["巳", "申"], text: "巳申合" },
      { type: "dizhixiangxing", members: ["寅", "巳", "申"], text: "寅巳申三刑" },
    ],
  },
  {
    name: "丑戌未三刑",
    input: ["丑", "戌", "未"],
    expectedDizhi: [
      { type: "dizhiliuchong", members: ["丑", "未"], text: "丑未冲" },
      { type: "dizhixiangxing", members: ["丑", "戌", "未"], text: "丑戌未三刑" },
    ],
  },
  {
    name: "寅刑巳",
    input: ["寅", "巳"],
    expectedDizhi: [
      { type: "dizhixiangxing", members: ["寅", "巳"], text: "寅刑巳" },
    ],
  },
  {
    name: "巳刑申受巳申合抑制",
    input: ["巳", "申"],
    expectedDizhi: [
      { type: "dizhiliuhe", members: ["巳", "申"], text: "巳申合" },
    ],
    suppressed: { type: "dizhixiangxing", members: ["巳", "申"], text: "巳刑申" },
  },
  {
    name: "申刑寅受寅申冲抑制",
    input: ["申", "寅"],
    expectedDizhi: [
      { type: "dizhiliuchong", members: ["寅", "申"], text: "寅申冲" },
    ],
    suppressed: { type: "dizhixiangxing", members: ["申", "寅"], text: "申刑寅" },
  },
  {
    name: "丑刑戌",
    input: ["丑", "戌"],
    expectedDizhi: [
      { type: "dizhixiangxing", members: ["丑", "戌"], text: "丑刑戌" },
    ],
  },
  {
    name: "戌刑未",
    input: ["戌", "未"],
    expectedDizhi: [
      { type: "dizhixiangxing", members: ["戌", "未"], text: "戌刑未" },
    ],
  },
  {
    name: "未刑丑受丑未冲抑制",
    input: ["未", "丑"],
    expectedDizhi: [
      { type: "dizhiliuchong", members: ["丑", "未"], text: "丑未冲" },
    ],
    suppressed: { type: "dizhixiangxing", members: ["未", "丑"], text: "未刑丑" },
  },
  {
    name: "子卯刑",
    input: ["子", "卯"],
    expectedDizhi: [
      { type: "dizhixiangxing", members: ["子", "卯"], text: "子卯刑" },
    ],
  },
  {
    name: "辰辰自刑",
    input: ["辰"],
    expectedDizhi: [
      { type: "dizhixiangxing", members: ["辰", "辰"], text: "辰辰自刑" },
    ],
  },
  {
    name: "午午自刑",
    input: ["午"],
    expectedDizhi: [
      { type: "dizhixiangxing", members: ["午", "午"], text: "午午自刑" },
    ],
  },
  {
    name: "酉酉自刑",
    input: ["酉"],
    expectedDizhi: [
      { type: "dizhixiangxing", members: ["酉", "酉"], text: "酉酉自刑" },
    ],
  },
  {
    name: "亥亥自刑",
    input: ["亥"],
    expectedDizhi: [
      { type: "dizhixiangxing", members: ["亥", "亥"], text: "亥亥自刑" },
    ],
  },
] as const;

function binaryItem(
  type: GanzhiRelationItem["type"],
  members: readonly [Tiangan, Tiangan] | readonly [Dizhi, Dizhi],
  suffix: string,
): GanzhiRelationItem {
  return { type, members, text: members.join("") + suffix };
}

describe("干支关系 - 66 项规范关系", () => {
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
    const expected: GanzhiRelationItem[] = [
      binaryItem("dizhiliuchong", [first, second], "冲"),
    ];
    if (first === "辰") {
      expected.push({
        type: "dizhixiangxing",
        members: ["辰", "辰"],
        text: "辰辰自刑",
      });
    }
    expect(result.dizhi).toEqual(expected);
  });

  it.each(dizhiliuheCases)("%s%s合", (first, second) => {
    const result = ganzhiRelations(inputFrom([
      ganzhiForDizhi(first),
      ganzhiForDizhi(second),
    ]));
    const expected: GanzhiRelationItem[] = [
      binaryItem("dizhiliuhe", [first, second], "合"),
    ];
    if (first === "辰" || first === "午") {
      expected.push({
        type: "dizhixiangxing",
        members: [first, first],
        text: `${first}${first}自刑`,
      });
    }
    expect(result.dizhi).toEqual(expected);
  });

  it.each(dizhisanheCases)("%s%s%s三合且排除内部半三合", (first, second, third) => {
    const result = ganzhiRelations(inputFrom([
      ganzhiForDizhi(first),
      ganzhiForDizhi(second),
      ganzhiForDizhi(third),
    ]));
    const expected: GanzhiRelationItem[] = [{
      type: "dizhisanhe",
      members: [first, second, third],
      text: `${first}${second}${third}三合`,
    }];
    if (first === "亥") {
      expected.push({
        type: "dizhixiangxing",
        members: ["亥", "亥"],
        text: "亥亥自刑",
      });
    }
    expect(result.dizhi).toEqual(expected);
  });

  it.each(dizhibansanheCases)("%s%s半三合", (first, second) => {
    const result = ganzhiRelations(inputFrom([
      ganzhiForDizhi(first),
      ganzhiForDizhi(second),
    ]));
    const expected: GanzhiRelationItem[] = [
      binaryItem("dizhibansanhe", [first, second], "半三合"),
    ];
    if (first === "亥" || first === "午" || first === "酉") {
      expected.push({
        type: "dizhixiangxing",
        members: [first, first],
        text: `${first}${first}自刑`,
      });
    }
    expect(result.dizhi).toEqual(expected);
  });

  it.each(dizhixiangxingCases)("$name", (testCase) => {
    const result = ganzhiRelations(inputFrom(testCase.input.map(ganzhiForDizhi)));
    expect(result.dizhi).toEqual(testCase.expectedDizhi);
    if ("suppressed" in testCase) {
      expect(result.dizhi).not.toContainEqual(testCase.suppressed);
    }
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

  it("含完整三刑的密集命例全部 24 种柱位排列结果一致", () => {
    const expected = {
      tiangan: [],
      dizhi: [
        { type: "dizhiliuchong", members: ["寅", "申"], text: "寅申冲" },
        { type: "dizhiliuhe", members: ["巳", "申"], text: "巳申合" },
        { type: "dizhibansanhe", members: ["申", "子"], text: "申子半三合" },
        { type: "dizhixiangxing", members: ["寅", "巳", "申"], text: "寅巳申三刑" },
      ],
    };

    const assignments = permutations(["己巳", "丙子", "丙寅", "丙申"] as const);
    expect(assignments).toHaveLength(24);
    for (const assignment of assignments) {
      expect(ganzhiRelations(inputFrom(assignment))).toEqual(expected);
    }
  });

  it.each(["辰", "午", "酉", "亥"] as const)(
    "%s自刑出现一次不成立，出现二、三、四次均只输出一次",
    (value) => {
      const expected = {
        type: "dizhixiangxing",
        members: [value, value],
        text: `${value}${value}自刑`,
      };
      for (const count of [1, 2, 3, 4]) {
        const filler = ["子", "丑", "寅", "卯"]
          .filter((candidate) => candidate !== value)
          .slice(0, 4 - count) as Dizhi[];
        const input = [
          ...Array.from({ length: count }, () => ganzhiForDizhi(value)),
          ...filler.map(ganzhiForDizhi),
        ];
        const matches = ganzhiRelations(inputFrom(input)).dizhi
          .filter((relation) => relation.text === expected.text);
        expect(matches).toEqual(count === 1 ? [] : [expected]);
      }
    },
  );

  it.each(["子", "丑", "寅", "卯"] as const)("%s重复四次不误报自刑", (value) => {
    expect(ganzhiRelations(inputFrom([ganzhiForDizhi(value)])).dizhi)
      .not.toContainEqual({
        type: "dizhixiangxing",
        members: [value, value],
        text: `${value}${value}自刑`,
      });
  });

  it("不同相刑配对与冲、自刑按规范顺序并存", () => {
    expect(ganzhiRelations(inputFrom([
      ganzhiForDizhi("午"),
      ganzhiForDizhi("午"),
      ganzhiForDizhi("子"),
      ganzhiForDizhi("卯"),
    ])).dizhi).toEqual([
      { type: "dizhiliuchong", members: ["子", "午"], text: "子午冲" },
      { type: "dizhixiangxing", members: ["子", "卯"], text: "子卯刑" },
      { type: "dizhixiangxing", members: ["午", "午"], text: "午午自刑" },
    ]);
  });

  it("重复柱位组合不重复输出同一两支相刑", () => {
    expect(ganzhiRelations(inputFrom([
      ganzhiForDizhi("寅"),
      ganzhiForDizhi("寅"),
      ganzhiForDizhi("巳"),
      ganzhiForDizhi("巳"),
    ])).dizhi).toEqual([
      { type: "dizhixiangxing", members: ["寅", "巳"], text: "寅刑巳" },
    ]);
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
    expect(ganzhiRelations(inputFrom(["甲子", "丙寅", "乙酉", "丁未"])))
      .toEqual({ tiangan: [], dizhi: [] });
  });

  it("一次调用的返回项不能污染后续调用", () => {
    const input = inputFrom(["甲子", "戊寅"]);
    const firstResult = ganzhiRelations(input);
    Reflect.set(firstResult.tiangan[0]!, "text", "污染");
    Reflect.set(firstResult.tiangan[0]!.members, 0, "乙");

    expect(ganzhiRelations(input)).toEqual({
      tiangan: [{
        type: "tianganxiangke",
        members: ["甲", "戊"],
        text: "甲克戊",
      }],
      dizhi: [],
    });
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
