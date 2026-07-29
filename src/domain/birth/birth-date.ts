// 出生日期解析与正式支持范围校验：供排盘、URL 恢复与个人信息计算共用。

import {
  MAX_SUPPORTED_YEAR,
  MIN_SUPPORTED_YEAR,
} from "@/domain/time/date-time";

/** 出生日期各部分。 */
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
  if (year < MIN_SUPPORTED_YEAR || year > MAX_SUPPORTED_YEAR) return null;
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

/** 正式支持的出生日期上限。 */
export function getBirthDateLimit(): BirthDateParts {
  return {
    year: MAX_SUPPORTED_YEAR,
    month: 12,
    day: 31,
  };
}

/** 出生日期是否超出正式支持范围。 */
export function isOutsideBirthDateRange(birthDate: BirthDateParts): boolean {
  return birthDate.year < MIN_SUPPORTED_YEAR || birthDate.year > MAX_SUPPORTED_YEAR;
}
