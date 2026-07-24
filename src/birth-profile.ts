// 出生资料统一模块：单个 typed 出生资料值对象 + 字符串校验与 URL 序列化。
// 词汇遵循 CONTEXT.md（出生资料、性别、出生地）。
//
// 校验逻辑（性别、日期、时间、省市同时性、出生地查找、出生日期上限）集中在此处的 parse，
// adapter 与表单共用一处。URL 参数格式不变（date/time/gender/province/city），
// URL 恢复时无效参数被静默忽略。模块不读时钟，当前年月由调用方注入。

import {
  parseBirthDate,
  isAfterBirthDateLimit,
  getBirthDateLimit,
  type CurrentYearMonth,
} from "./birth-date.js";
import { findLongitude, type Birthplace } from "./birthplace.js";
import type { Gender } from "./dayun.js";

/** 出生资料字符串表单（网页提交 / URL 参数）。省市可同时为空或同时给出。 */
export interface BirthDataInput {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  gender: string;
  province?: string;
  city?: string;
}

/** 出生资料（typed 值对象）：年月日时分 + 性别 + 可选出生地。 */
export interface BirthProfile {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: Gender;
  birthplace?: Birthplace;
}

/** parse 结果：成功返回 typed 出生资料，失败返回字段级错误。 */
export type ParseResult =
  | { ok: true; value: BirthProfile }
  | { ok: false; fields: Record<string, string> };

const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

/** 解析 HH:mm 为时分；非法或越界返回 null。parse 与 fromUrlParams 共用。 */
function parseTime(value: string): { hour: number; minute: number } | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  const hour = parseInt(match[1]!, 10);
  const minute = parseInt(match[2]!, 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * 校验出生资料字符串并转为 typed 值。失败返回字段级错误（字段名 → 中文消息）。
 * 校验项：性别、日期、时间、省市同时性、出生地查找、出生日期上限。
 */
export function parse(input: BirthDataInput, now: CurrentYearMonth): ParseResult {
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

  const parsedTime = parseTime(input.time);
  let hour = 0, minute = 0;
  if (parsedTime) {
    hour = parsedTime.hour;
    minute = parsedTime.minute;
  }
  if (!parsedTime) {
    fields.time = "出生时间须为有效 HH:mm";
  }

  if (dateValid && parsedTime) {
    const limit = getBirthDateLimit(now);
    if (isAfterBirthDateLimit(parsedDate, now)) {
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
    return { ok: false, fields };
  }

  const birthplace: Birthplace | undefined =
    hasProv && hasCity ? { province: input.province!, city: input.city! } : undefined;
  return {
    ok: true,
    value: { year, month, day, hour, minute, gender: input.gender as Gender, birthplace },
  };
}

/**
 * 从 URL 参数恢复出生资料字符串默认值；无效参数静默忽略（返回 undefined）。
 * 不做出生地查找与日期上限校验——这些在排盘提交时由 parse 兜底。
 */
export function fromUrlParams(params: URLSearchParams): Partial<BirthDataInput> {
  const date = params.get("date");
  const time = params.get("time");
  const gender = params.get("gender");
  const province = params.get("province");
  const city = params.get("city");

  return {
    date: date && parseBirthDate(date) !== null ? date : undefined,
    time: time && parseTime(time) !== null ? time : undefined,
    gender: gender === "男" || gender === "女" ? gender : undefined,
    province: province || undefined,
    city: city || undefined,
  };
}

/** 把出生资料字符串序列化为 URL 参数；省市同时给时才写入，格式保持向后兼容。 */
export function toUrlParams(input: BirthDataInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("date", input.date);
  params.set("time", input.time);
  params.set("gender", input.gender);
  if (input.province && input.city) {
    params.set("province", input.province);
    params.set("city", input.city);
  }
  return params;
}