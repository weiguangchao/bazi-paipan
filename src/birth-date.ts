// 出生日期解析与上限校验：供排盘校验与个人信息计算共用。
// 上限按北京时间（UTC+8）读机器时钟得出"今天"，再加 100 个日历年。

import { BEIJING_OFFSET_MS } from "./beijing-time.js";

export interface BirthDateParts {
  year: number;
  month: number;
  day: number;
}

/** 解析 YYYY-MM-DD 为公历日期各部分；非法或非该格式返回 null。 */
export function parseBirthDate(value: unknown): BirthDateParts | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10);
  const day = parseInt(match[3]!, 10);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** 以北京时间"今天"为基准的出生日期上限（今天 + 100 个日历年）。 */
export function getBirthDateLimit(nowMs: number): BirthDateParts {
  const now = new Date(nowMs + BEIJING_OFFSET_MS);
  return {
    year: now.getUTCFullYear() + 100,
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
}

/** 出生日期是否晚于上限（按年、月、日逐位比较）。 */
export function isAfterBirthDateLimit(birthDate: BirthDateParts, nowMs: number): boolean {
  const limit = getBirthDateLimit(nowMs);
  if (birthDate.year !== limit.year) return birthDate.year > limit.year;
  if (birthDate.month !== limit.month) return birthDate.month > limit.month;
  return birthDate.day > limit.day;
}
