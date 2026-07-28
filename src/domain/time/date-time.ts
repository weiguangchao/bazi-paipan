const beijingDateTimeBrand: unique symbol = Symbol("BeijingDateTime");
const trueSolarDateTimeBrand: unique symbol = Symbol("TrueSolarDateTime");

export const MIN_SUPPORTED_YEAR = 1801;
export const MAX_SUPPORTED_YEAR = 2099;

export interface DateTimeFields {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

export interface BeijingDateTime extends DateTimeFields {
  readonly [beijingDateTimeBrand]: true;
}

export interface TrueSolarDateTime extends DateTimeFields {
  readonly longitudeCorrectionApplied: boolean;
  readonly [trueSolarDateTimeBrand]: true;
}

function assertInteger(value: number, field: keyof DateTimeFields): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${field} 必须是整数：${String(value)}`);
  }
}

function assertValidFields(fields: DateTimeFields): void {
  for (const field of ["year", "month", "day", "hour", "minute", "second"] as const) {
    assertInteger(fields[field], field);
  }
  const timestamp = Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second,
  );
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== fields.year
    || parsed.getUTCMonth() + 1 !== fields.month
    || parsed.getUTCDate() !== fields.day
    || parsed.getUTCHours() !== fields.hour
    || parsed.getUTCMinutes() !== fields.minute
    || parsed.getUTCSeconds() !== fields.second
  ) {
    throw new RangeError(`非法日期时间：${JSON.stringify(fields)}`);
  }
}

function fieldsFromTimestamp(timestamp: number): DateTimeFields {
  const date = new Date(timestamp);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

export function dateTimeTimestamp(value: DateTimeFields): number {
  assertValidFields(value);
  return Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second,
  );
}

export function beijingDateTime(fields: DateTimeFields): BeijingDateTime {
  assertValidFields(fields);
  if (fields.year < MIN_SUPPORTED_YEAR || fields.year > MAX_SUPPORTED_YEAR) {
    throw new RangeError(
      `钟表时年份须在 ${MIN_SUPPORTED_YEAR}–${MAX_SUPPORTED_YEAR}：${fields.year}`,
    );
  }
  return { ...fields } as BeijingDateTime;
}

/** 仅供天文 facade 构造派生交节时刻；出生资料范围仍由 beijingDateTime 守住。 */
export function derivedBeijingDateTime(fields: DateTimeFields): BeijingDateTime {
  assertValidFields(fields);
  return { ...fields } as BeijingDateTime;
}

export function trueSolarDateTime(
  fields: DateTimeFields,
  longitudeCorrectionApplied: boolean,
): TrueSolarDateTime {
  assertValidFields(fields);
  return { ...fields, longitudeCorrectionApplied } as TrueSolarDateTime;
}

export function compareDateTime(left: DateTimeFields, right: DateTimeFields): -1 | 0 | 1 {
  const difference = dateTimeTimestamp(left) - dateTimeTimestamp(right);
  return difference < 0 ? -1 : difference > 0 ? 1 : 0;
}

export function diffSeconds(left: DateTimeFields, right: DateTimeFields): number {
  return (dateTimeTimestamp(left) - dateTimeTimestamp(right)) / 1000;
}

export function addSeconds(
  value: TrueSolarDateTime,
  seconds: number,
): TrueSolarDateTime;
export function addSeconds(value: BeijingDateTime, seconds: number): BeijingDateTime;
export function addSeconds(value: DateTimeFields, seconds: number): DateTimeFields;
export function addSeconds(
  value: DateTimeFields,
  seconds: number,
): DateTimeFields {
  if (!Number.isInteger(seconds)) {
    throw new RangeError(`seconds 必须是整数：${String(seconds)}`);
  }
  const fields = fieldsFromTimestamp(dateTimeTimestamp(value) + seconds * 1000);
  if ("longitudeCorrectionApplied" in value) {
    return trueSolarDateTime(
      fields,
      (value as TrueSolarDateTime).longitudeCorrectionApplied,
    );
  }
  return fields as BeijingDateTime;
}
