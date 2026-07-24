// 出生日期解析与上限校验：供排盘校验与个人信息计算共用。
// 上限按当前北京年月（{ year, month }）为基准加 100 个日历年，取该月最后一日。
// 不读机器时钟——当前年月由调用方（边缘）注入。

/** 出生日期各部分。 */
export interface BirthDateParts {
  year: number;
  month: number;
  day: number;
}

/** 当前北京年月，由边缘注入，core 不读时钟。 */
export interface CurrentYearMonth {
  year: number;
  month: number;
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

/** 某年某月（1-12）的最后一日。 */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 以当前北京年月为基准的出生日期上限（当月 + 100 个日历年，取该月最后一日）。 */
export function getBirthDateLimit(now: CurrentYearMonth): BirthDateParts {
  return {
    year: now.year + 100,
    month: now.month,
    day: lastDayOfMonth(now.year + 100, now.month),
  };
}

/** 出生日期是否晚于上限（按年、月、日逐位比较）。 */
export function isAfterBirthDateLimit(birthDate: BirthDateParts, now: CurrentYearMonth): boolean {
  const limit = getBirthDateLimit(now);
  if (birthDate.year !== limit.year) return birthDate.year > limit.year;
  if (birthDate.month !== limit.month) return birthDate.month > limit.month;
  return birthDate.day > limit.day;
}