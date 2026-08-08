// PROTOTYPE — 抛弃式类型草案，不是生产代码。回答 issue #182：
// FateChart 的领域类型与输出契约长什么样。只有类型与签名，没有实现。
//
// 词汇来自 issue #181 的已确认决策。原始类型（SixtyCycle / HeavenStem / EarthBranch）
// 在此就地重声明，让草案自包含、可整体阅读；真实迁移时它们来自 ganzhi 模块。

// ---------------------------------------------------------------------------
// 1. 原始值：干支
// ---------------------------------------------------------------------------

export type HeavenStem =
  | "甲" | "乙" | "丙" | "丁" | "戊"
  | "己" | "庚" | "辛" | "壬" | "癸";

export type EarthBranch =
  | "子" | "丑" | "寅" | "卯" | "辰" | "巳"
  | "午" | "未" | "申" | "酉" | "戌" | "亥";

/** 六十甲子：阳干配阳支、阴干配阴支的模板字面量联合（现 Ganzhi）。 */
export type SixtyCycle = `${HeavenStem}${EarthBranch}`; // 草案简化；真实定义保留奇偶配对约束

/** 四个位置类型是 SixtyCycle 的无 brand 别名——只表达读者意图，不加运行时包装。 */
export type SixtyCycleYear = SixtyCycle;
export type SixtyCycleMonth = SixtyCycle;
export type SixtyCycleDay = SixtyCycle;
export type SixtyCycleHour = SixtyCycle;

// ---------------------------------------------------------------------------
// 2. 十神
// ---------------------------------------------------------------------------

/** 只有十种十神。"日主" 不是十神，见 EightCharTenStars.day。 */
export type TenStar =
  | "比肩" | "劫财"
  | "食神" | "伤官"
  | "偏财" | "正财"
  | "七杀" | "正官"
  | "偏印" | "正印";

/** 藏干及其相对日主的十神。静态藏干表只存 EarthBranch → HeavenStem[]，十神在此处附加。 */
export interface HiddenHeavenStem {
  heavenStem: HeavenStem;
  tenStar: TenStar;
}

// ---------------------------------------------------------------------------
// 3. 八字：纯值，不携带任何分析
// ---------------------------------------------------------------------------

export interface EightChar {
  year: SixtyCycleYear;
  month: SixtyCycleMonth;
  day: SixtyCycleDay;
  hour: SixtyCycleHour;
}

// ---------------------------------------------------------------------------
// 4. 四柱十神分析：与 EightChar 平行，按四个位置组织
// ---------------------------------------------------------------------------

/** 单个位置的十神分析：天干十神 + 全部藏干十神（顺序同藏干表）。 */
export interface SixtyCycleTenStars {
  /** 日柱天干即日主，无十神，取 null。 */
  heavenStemTenStar: TenStar | null;
  hiddenHeavenStems: HiddenHeavenStem[];
}

export interface EightCharTenStars {
  year: SixtyCycleTenStars;
  month: SixtyCycleTenStars;
  /** heavenStemTenStar 恒为 null——日主位。界面据此展示 "日主"。 */
  day: SixtyCycleTenStars;
  hour: SixtyCycleTenStars;
}

// ---------------------------------------------------------------------------
// 5. 大运层级：DecadeFortune → 年度 → 月度
// ---------------------------------------------------------------------------

export type DecadeFortuneDirection = "forward" | "backward";

/** 起运岁：整年 + 整月（0-11），命理表述 "N岁M月起运"。 */
export interface FortuneStartAge {
  years: number;
  months: number;
}

/**
 * 大运 / 年度 / 月度三层共用的十神分析。
 * 单独成型，让「十神是附加在干支上的分析」在类型里看得见——与四柱把
 * eightChar 和 eightCharTenStars 分成两棵树是同一套心智模型。
 */
export interface FortuneTenStars {
  heavenStem: TenStar;
  /** 地支首个藏干（本气）的十神。不是 "地支的十神"。 */
  primaryHiddenHeavenStem: TenStar;
}

export interface MonthlyFortune {
  sixtyCycle: SixtyCycleMonth;
  /** 该月起始之 "节"。 */
  startSolarTerm: string;
  startMonth: number;
  startDay: number;
  tenStars: FortuneTenStars;
  isCurrent: boolean;
}

export interface AnnualFortune {
  year: number;
  sixtyCycle: SixtyCycleYear;
  tenStars: FortuneTenStars;
  isCurrent: boolean;
  /** 固定十二个完整月度节点；定长不变量由实现与测试保证，不用 tuple 表达。 */
  monthlyFortunes: MonthlyFortune[];
}

/** 单步十年大运。 */
export interface DecadeFortune {
  sixtyCycle: SixtyCycle;
  startAge: FortuneStartAge;
  startYear: number;
  startMonth: number;
  tenStars: FortuneTenStars;
  isCurrent: boolean;
  /** 固定十个完整年度节点；定长不变量由实现与测试保证，不用 tuple 表达。 */
  annualFortunes: AnnualFortune[];
}

/** 完整大运集合。 */
export interface DecadeFortuneSequence {
  direction: DecadeFortuneDirection;
  startAge: FortuneStartAge;
  decadeFortunes: DecadeFortune[];
}

// ---------------------------------------------------------------------------
// 6. 完整命盘与外部 seam
// ---------------------------------------------------------------------------

/** 生肖与星座（现 PersonalInfo）。 */
export interface BirthSigns {
  chineseZodiac: string;
  zodiacSign: string;
}

/** 干支关系（现 GanzhiRelationsResult）。 */
export interface SixtyCycleRelations {
  heavenStem: readonly SixtyCycleRelationItem[];
  earthBranch: readonly SixtyCycleRelationItem[];
}

export interface SixtyCycleRelationItem {
  readonly type: string;
  readonly members: readonly (HeavenStem | EarthBranch)[];
  readonly text: string;
}

/** 完整命盘：唯一外部输出契约。 */
export interface FateChart {
  birthSigns: BirthSigns;
  eightChar: EightChar;
  eightCharTenStars: EightCharTenStars;
  sixtyCycleRelations: SixtyCycleRelations;
  decadeFortuneSequence: DecadeFortuneSequence;
}

/** 出生资料（现 BirthProfile）；出生地可选。 */
export interface BirthProfileDraft {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: "男" | "女";
  birthplace?: { province: string; city: string };
}

export type BeijingDateTimeDraft = { readonly year: number; readonly month: number };

/** 唯一外部 seam。 */
export declare function generateFateChart(
  profile: BirthProfileDraft,
  currentTime: BeijingDateTimeDraft,
): FateChart;

// ---------------------------------------------------------------------------
// 7. 内部纯计算 seam：不冒充完整命盘
// ---------------------------------------------------------------------------

/** 大运骨架：只有干支与时间锚点，没有十神、没有年度/月度展开。 */
export interface DecadeFortuneStepCalculation {
  index: number;
  sixtyCycle: SixtyCycle;
  startAge: FortuneStartAge;
  startYear: number;
  startMonth: number;
}

export interface DecadeFortuneSequenceCalculation {
  direction: DecadeFortuneDirection;
  startAge: FortuneStartAge;
  steps: DecadeFortuneStepCalculation[];
}

/**
 * 内部计算结果：八字四柱 + 大运骨架。
 * 刻意不含十神、年度、月度、干支关系、生肖星座——那些由 generateFateChart() 组装。
 */
export interface EightCharAndDecadeFortuneCalculation {
  eightChar: EightChar;
  decadeFortuneSequence: DecadeFortuneSequenceCalculation;
}

export type TrueSolarDateTimeDraft = { readonly year: number; readonly month: number };
export type SolarTermLocationDraft = { readonly lichunYear: number };

export declare function calculateEightCharAndDecadeFortune(
  birthTime: TrueSolarDateTimeDraft,
  solarTermLocation: SolarTermLocationDraft,
  gender: "男" | "女",
): EightCharAndDecadeFortuneCalculation;

// ---------------------------------------------------------------------------
// 8. 契约体检：这些赋值必须通过类型检查
// ---------------------------------------------------------------------------

const sampleEightChar: EightChar = {
  year: "庚午",
  month: "戊寅",
  day: "戊午",
  hour: "壬子",
};

const sampleDayPosition: SixtyCycleTenStars = {
  heavenStemTenStar: null, // 日主
  hiddenHeavenStems: [
    { heavenStem: "丁", tenStar: "正印" },
    { heavenStem: "己", tenStar: "劫财" },
  ],
};

const sampleMonthlyFortune: MonthlyFortune = {
  sixtyCycle: "戊寅",
  startSolarTerm: "立春",
  startMonth: 2,
  startDay: 4,
  tenStars: { heavenStem: "比肩", primaryHiddenHeavenStem: "七杀" },
  isCurrent: false,
};

export const prototypeSamples = {
  sampleEightChar,
  sampleDayPosition,
  sampleMonthlyFortune,
};
