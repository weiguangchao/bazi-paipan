// 排盘 API 适配层：把网页输入适配到命盘模块，组合浏览器导向输出。
// 唯一业务 API POST /api/paipan 的处理逻辑。校验逻辑收进出生资料模块（src/birth-profile.ts）的 parse，
// 本层做：调 parse → 错误信封 / 调命盘 → PaipanData。adapter 不读时钟，当前年月由调用方注入。
// 词汇遵循 CONTEXT.md。错误信封与成功信封由本模块产出。

import { mingpan } from "../mingpan.js";
import type {
  CangganOut,
  ZhuOut,
  SizhuOut,
  LiunianItemOut,
  DayunzhuOut,
  DayunOut,
  Mingpan,
} from "../mingpan.js";
import {
  parse,
  type BirthDataInput,
} from "../birth-profile.js";
import type { CurrentYearMonth } from "../birth-date.js";

// 命盘结构类型经适配层再导出，供展示层（@/api/paipan）引用，形态不变。
export type {
  CangganOut,
  ZhuOut,
  SizhuOut,
  LiunianItemOut,
  DayunzhuOut,
  DayunOut,
  Mingpan,
};

/** API 输入：出生资料字符串表单（网页提交）。省市可同时为空或同时给出。 */
export type PaipanInput = BirthDataInput;

/** 字段级错误：invalid 字段名集合 + 全局中文消息 + 错误码。 */
export interface PaipanError {
  code: string;
  message: string;
  fields: Record<string, string>;
}

export interface PaipanData {
  input: { date: string; time: string; gender: string; province: string; city: string };
  personal: Mingpan["personal"];
  sizhu: SizhuOut;
  ganzhiRelations: Mingpan["ganzhiRelations"];
  tips: string[];
  dayun: DayunOut;
}

export const DEFAULT_PROVINCE = "北京市";
export const DEFAULT_CITY = "市辖区";

export async function computePaipan(
  input: PaipanInput,
  now: CurrentYearMonth,
): Promise<{ ok: true; data: PaipanData } | { ok: false; error: PaipanError }> {
  const parsed = parse(input, now);
  if (!parsed.ok) {
    const fields = parsed.fields;
    return {
      ok: false,
      error: {
        code: fields.province || fields.city ? "UNKNOWN_BIRTHPLACE" : "INVALID_INPUT",
        message: Object.values(fields)[0]!,
        fields,
      },
    };
  }

  const mingpanResult = await mingpan(parsed.value, now);

  return {
    ok: true,
    data: {
      input: { date: input.date, time: input.time, gender: input.gender, province: input.province ?? "", city: input.city ?? "" },
      personal: mingpanResult.personal,
      sizhu: mingpanResult.sizhu,
      ganzhiRelations: mingpanResult.ganzhiRelations,
      tips: mingpanResult.tips,
      dayun: mingpanResult.dayun,
    },
  };
}