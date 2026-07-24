import {
  assertGanzhi,
  ganzhiDizhi,
  ganzhiTiangan,
  type Dizhi,
  type Ganzhi,
  type Tiangan,
} from "@/domain/ganzhi/ganzhi";

export type GanzhiRelationType =
  | "tianganxiangke"
  | "tianganwuhe"
  | "dizhiliuchong"
  | "dizhiliuhe"
  | "dizhisanhe"
  | "dizhibansanhe"
  | "dizhixiangxing";

export interface GanzhiRelationItem {
  readonly type: GanzhiRelationType;
  readonly members:
    | readonly [Tiangan, Tiangan]
    | readonly [Dizhi, Dizhi]
    | readonly [Dizhi, Dizhi, Dizhi];
  readonly text: string;
}

export interface GanzhiRelationsResult {
  tiangan: readonly GanzhiRelationItem[];
  dizhi: readonly GanzhiRelationItem[];
}

export interface GanzhiRelationsInput {
  nianzhu: Ganzhi;
  yuezhu: Ganzhi;
  rizhu: Ganzhi;
  shizhu: Ganzhi;
}

type TianganBinaryRelation = GanzhiRelationItem & {
  members: readonly [Tiangan, Tiangan];
};

type DizhiBinaryRelation = GanzhiRelationItem & {
  members: readonly [Dizhi, Dizhi];
};

type DizhiTernaryRelation = GanzhiRelationItem & {
  members: readonly [Dizhi, Dizhi, Dizhi];
};

const tianganxiangkeTable = [
  relationItem("tianganxiangke", ["甲", "戊"], "甲克戊"),
  relationItem("tianganxiangke", ["甲", "己"], "甲克己"),
  relationItem("tianganxiangke", ["乙", "戊"], "乙克戊"),
  relationItem("tianganxiangke", ["乙", "己"], "乙克己"),
  relationItem("tianganxiangke", ["戊", "壬"], "戊克壬"),
  relationItem("tianganxiangke", ["戊", "癸"], "戊克癸"),
  relationItem("tianganxiangke", ["己", "壬"], "己克壬"),
  relationItem("tianganxiangke", ["己", "癸"], "己克癸"),
  relationItem("tianganxiangke", ["壬", "丙"], "壬克丙"),
  relationItem("tianganxiangke", ["壬", "丁"], "壬克丁"),
  relationItem("tianganxiangke", ["癸", "丙"], "癸克丙"),
  relationItem("tianganxiangke", ["癸", "丁"], "癸克丁"),
  relationItem("tianganxiangke", ["丙", "庚"], "丙克庚"),
  relationItem("tianganxiangke", ["丙", "辛"], "丙克辛"),
  relationItem("tianganxiangke", ["丁", "庚"], "丁克庚"),
  relationItem("tianganxiangke", ["丁", "辛"], "丁克辛"),
  relationItem("tianganxiangke", ["庚", "甲"], "庚克甲"),
  relationItem("tianganxiangke", ["庚", "乙"], "庚克乙"),
  relationItem("tianganxiangke", ["辛", "甲"], "辛克甲"),
  relationItem("tianganxiangke", ["辛", "乙"], "辛克乙"),
] as const satisfies readonly TianganBinaryRelation[];

const tianganwuheTable = [
  relationItem("tianganwuhe", ["甲", "己"], "甲己合"),
  relationItem("tianganwuhe", ["乙", "庚"], "乙庚合"),
  relationItem("tianganwuhe", ["丙", "辛"], "丙辛合"),
  relationItem("tianganwuhe", ["丁", "壬"], "丁壬合"),
  relationItem("tianganwuhe", ["戊", "癸"], "戊癸合"),
] as const satisfies readonly TianganBinaryRelation[];

const dizhiliuchongTable = [
  relationItem("dizhiliuchong", ["子", "午"], "子午冲"),
  relationItem("dizhiliuchong", ["丑", "未"], "丑未冲"),
  relationItem("dizhiliuchong", ["寅", "申"], "寅申冲"),
  relationItem("dizhiliuchong", ["卯", "酉"], "卯酉冲"),
  relationItem("dizhiliuchong", ["辰", "戌"], "辰戌冲"),
  relationItem("dizhiliuchong", ["巳", "亥"], "巳亥冲"),
] as const satisfies readonly DizhiBinaryRelation[];

const dizhiliuheTable = [
  relationItem("dizhiliuhe", ["子", "丑"], "子丑合"),
  relationItem("dizhiliuhe", ["寅", "亥"], "寅亥合"),
  relationItem("dizhiliuhe", ["卯", "戌"], "卯戌合"),
  relationItem("dizhiliuhe", ["辰", "酉"], "辰酉合"),
  relationItem("dizhiliuhe", ["巳", "申"], "巳申合"),
  relationItem("dizhiliuhe", ["午", "未"], "午未合"),
] as const satisfies readonly DizhiBinaryRelation[];

const dizhisanheTable = [
  relationItem("dizhisanhe", ["申", "子", "辰"], "申子辰三合"),
  relationItem("dizhisanhe", ["亥", "卯", "未"], "亥卯未三合"),
  relationItem("dizhisanhe", ["寅", "午", "戌"], "寅午戌三合"),
  relationItem("dizhisanhe", ["巳", "酉", "丑"], "巳酉丑三合"),
] as const satisfies readonly DizhiTernaryRelation[];

const dizhibansanheTable = [
  relationItem("dizhibansanhe", ["申", "子"], "申子半三合"),
  relationItem("dizhibansanhe", ["子", "辰"], "子辰半三合"),
  relationItem("dizhibansanhe", ["申", "辰"], "申辰半三合"),
  relationItem("dizhibansanhe", ["亥", "卯"], "亥卯半三合"),
  relationItem("dizhibansanhe", ["卯", "未"], "卯未半三合"),
  relationItem("dizhibansanhe", ["亥", "未"], "亥未半三合"),
  relationItem("dizhibansanhe", ["寅", "午"], "寅午半三合"),
  relationItem("dizhibansanhe", ["午", "戌"], "午戌半三合"),
  relationItem("dizhibansanhe", ["寅", "戌"], "寅戌半三合"),
  relationItem("dizhibansanhe", ["巳", "酉"], "巳酉半三合"),
  relationItem("dizhibansanhe", ["酉", "丑"], "酉丑半三合"),
  relationItem("dizhibansanhe", ["巳", "丑"], "巳丑半三合"),
] as const satisfies readonly DizhiBinaryRelation[];

const dizhixiangxingTable = [
  relationItem("dizhixiangxing", ["寅", "巳", "申"], "寅巳申三刑"),
  relationItem("dizhixiangxing", ["丑", "戌", "未"], "丑戌未三刑"),
  relationItem("dizhixiangxing", ["寅", "巳"], "寅刑巳"),
  relationItem("dizhixiangxing", ["巳", "申"], "巳刑申"),
  relationItem("dizhixiangxing", ["申", "寅"], "申刑寅"),
  relationItem("dizhixiangxing", ["丑", "戌"], "丑刑戌"),
  relationItem("dizhixiangxing", ["戌", "未"], "戌刑未"),
  relationItem("dizhixiangxing", ["未", "丑"], "未刑丑"),
  relationItem("dizhixiangxing", ["子", "卯"], "子卯刑"),
  relationItem("dizhixiangxing", ["辰", "辰"], "辰辰自刑"),
  relationItem("dizhixiangxing", ["午", "午"], "午午自刑"),
  relationItem("dizhixiangxing", ["酉", "酉"], "酉酉自刑"),
  relationItem("dizhixiangxing", ["亥", "亥"], "亥亥自刑"),
] as const satisfies readonly (DizhiBinaryRelation | DizhiTernaryRelation)[];

function relationItem<
  Type extends GanzhiRelationType,
  Members extends GanzhiRelationItem["members"],
>(
  type: Type,
  members: Members,
  text: string,
): { readonly type: Type; readonly members: Members; readonly text: string } {
  Object.freeze(members);
  return Object.freeze({ type, members, text });
}

function includesAll<T>(values: ReadonlySet<T>, members: readonly T[]): boolean {
  return members.every((member) => values.has(member));
}

function sameMemberSet<T>(
  first: readonly [T, T],
  second: readonly [T, T],
): boolean {
  return first.every((member) => second.includes(member));
}

/**
 * 从命名四柱计算规范干支关系。判定只依赖值集合，输出顺序由规范表固定。
 */
export function ganzhiRelations(input: GanzhiRelationsInput): GanzhiRelationsResult {
  const fields = ["nianzhu", "yuezhu", "rizhu", "shizhu"] as const;
  const values: Ganzhi[] = [];
  for (const field of fields) {
    const value = input[field];
    assertGanzhi(value, field);
    values.push(value);
  }

  const tianganValues = new Set(values.map(ganzhiTiangan));
  const dizhi = values.map(ganzhiDizhi);
  const dizhiValues = new Set(dizhi);
  const dizhiOccurrences = new Map<Dizhi, number>();
  for (const value of dizhi) {
    dizhiOccurrences.set(value, (dizhiOccurrences.get(value) ?? 0) + 1);
  }

  const tianganwuhe = tianganwuheTable.filter(
    (relation) => includesAll(tianganValues, relation.members),
  );
  const tianganxiangke = tianganxiangkeTable.filter(
    (relation) =>
      includesAll(tianganValues, relation.members)
      && !tianganwuhe.some((matched) => sameMemberSet(relation.members, matched.members)),
  );

  const dizhisanhe = dizhisanheTable.filter(
    (relation) => includesAll(dizhiValues, relation.members),
  );
  const dizhibansanhe = dizhibansanheTable.filter(
    (relation) =>
      includesAll(dizhiValues, relation.members)
      && !dizhisanhe.some((matched) => includesAll(new Set(matched.members), relation.members)),
  );
  const dizhiliuchong = dizhiliuchongTable.filter(
    (relation) => includesAll(dizhiValues, relation.members),
  );
  const dizhiliuhe = dizhiliuheTable.filter(
    (relation) => includesAll(dizhiValues, relation.members),
  );
  const matchedDizhixiangxing = dizhixiangxingTable.filter((relation) => {
    if (relation.members.length === 2 && relation.members[0] === relation.members[1]) {
      return (dizhiOccurrences.get(relation.members[0]) ?? 0) >= 2;
    }
    return includesAll(dizhiValues, relation.members);
  });
  const dizhixiangxing = matchedDizhixiangxing.filter((relation) => {
    if (relation.members.length === 3) {
      return true;
    }
    if (relation.members[0] === relation.members[1]) {
      return true;
    }
    const members: readonly [Dizhi, Dizhi] = relation.members;
    if (matchedDizhixiangxing.some(
      (matched) =>
        matched.members.length === 3
        && includesAll(new Set<Dizhi>(matched.members), members),
    )) {
      return false;
    }
    return ![...dizhiliuchong, ...dizhiliuhe].some(
      (matched) => sameMemberSet(matched.members, members),
    );
  });

  return {
    tiangan: [...tianganxiangke, ...tianganwuhe],
    dizhi: [
      ...dizhiliuchong,
      ...dizhiliuhe,
      ...dizhisanhe,
      ...dizhibansanhe,
      ...dizhixiangxing,
    ],
  };
}
