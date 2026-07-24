// 排盘 API 适配层：把网页输入适配到命盘模块，组合浏览器导向输出。
// 唯一业务 API POST /api/paipan 的处理逻辑。命理附加逻辑已收进命盘模块（src/mingpan.ts），
// 本层只做字符串校验 + 构造 typed 出生资料 + 调命盘 + 返回 PaipanData。
// 词汇遵循 CONTEXT.md。错误信封与成功信封由本模块产出。adapter 不读时钟，当前年月由调用方注入。

import { mingpan } from "../mingpan.js";
import type {
  CangganOut,
  ZhuOut,
  SizhuOut,
  LiunianItemOut,
  DayunzhuOut,
  DayunOut,
  TipOut,
  Mingpan,
} from "../mingpan.js";
import type { PaipanInput as DomainPaipanInput } from "../paipan.js";
import { findLongitude, type Birthplace } from "../birthplace.js";
import type { Gender } from "../dayun.js";
import {
  isAfterBirthDateLimit,
  getBirthDateLimit,
  parseBirthDate,
  type CurrentYearMonth,
} from "../birth-date.js";

// 命盘结构类型经适配层再导出，供展示层（@/api/paipan）引用，形态不变。
export type {
  CangganOut,
  ZhuOut,
  SizhuOut,
  LiunianItemOut,
  DayunzhuOut,
  DayunOut,
  TipOut,
  Mingpan,
};

/** API 输入：出生资料（网页提交）。省市可同时为空或同时给出。 */
export interface PaipanInput {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  gender: string;
  province?: string;
  city?: string;
}

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
  tips: TipOut[];
  dayun: DayunOut;
}

export const DEFAULT_PROVINCE = "北京市";
export const DEFAULT_CITY = "市辖区";

export async function computePaipan(
  input: PaipanInput,
  now: CurrentYearMonth,
): Promise<{ ok: true; data: PaipanData } | { ok: false; error: PaipanError }> {
  const fields: Record<string, string> = {};

  if (input.gender !== "男" && input.gender !== "女") {
    fields.gender = "性别须为 男 或 女";
  }

  const parsedDate = parseBirthDate(input.date);
  let year = 0, month = 0, day = 0;
  const dateValid = parsedDate !== null;
  if (parsedDate) {
    year = parsedDate.year;
    month = parsedDate.month;
    day = parsedDate.day;
  }
  if (!dateValid) {
    fields.date = "出生日期须为有效公历 YYYY-MM-DD";
  }

  const timeMatch = /^(\d{2}):(\d{2})$/.exec(input.time);
  let hour = 0, minute = 0;
  let timeValid = false;
  if (timeMatch) {
    hour = parseInt(timeMatch[1]!, 10);
    minute = parseInt(timeMatch[2]!, 10);
    timeValid = hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }
  if (!timeMatch || !timeValid) {
    fields.time = "出生时间须为有效 HH:mm";
  }

  if (dateValid && timeValid) {
    const limit = getBirthDateLimit(now);
    if (isAfterBirthDateLimit(parsedDate!, now)) {
      fields.date = "出生日期不得晚于服务当前北京日期后 100 个日历年（" + limit.year + "-" + String(limit.month).padStart(2, "0") + "-" + String(limit.day).padStart(2, "0") + "）";
    }
  }

  const hasProv = input.province !== undefined && input.province !== "";
  const hasCity = input.city !== undefined && input.city !== "";
  if (hasProv !== hasCity) {
    fields.province = "省份与城市须同时给出或同时清空";
    fields.city = "省份与城市须同时给出或同时清空";
  } else if (hasProv && hasCity) {
    const lookup = findLongitude({ province: input.province!, city: input.city! });
    if (!lookup.found) {
      if (lookup.reason === "未知省份") {
        fields.province = "未知省份：" + input.province;
      } else {
        fields.city = "省份" + input.province + "下无城市" + input.city;
      }
    }
  }

  if (Object.keys(fields).length > 0) {
    return {
      ok: false,
      error: {
        code: fields.province || fields.city ? "UNKNOWN_BIRTHPLACE" : "INVALID_INPUT",
        message: Object.values(fields)[0]!,
        fields,
      },
    };
  }

  const birthplace: Birthplace | undefined =
    hasProv && hasCity ? { province: input.province!, city: input.city! } : undefined;
  const domainInput: DomainPaipanInput = { year, month, day, hour, minute, birthplace, gender: input.gender as Gender };

  const mingpanResult = await mingpan(domainInput, now);

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