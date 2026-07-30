import {
  dateTimeTimestamp,
  trueSolarDateTime,
  type BeijingDateTime,
  type TrueSolarDateTime,
} from "@/domain/time/date-time";
import {
  equationOfTimeDays,
  julianDayFromFields,
  solarLongitudeMomentBeijingDays,
} from "@/domain/time/shouxing/solar-core";

export const JIE_NAMES = [
  "立春", "惊蛰", "清明", "立夏", "芒种", "小暑",
  "立秋", "白露", "寒露", "立冬", "大雪", "小寒",
] as const;

export type Jie = typeof JIE_NAMES[number];

const J2000 = 2451545;
const SECONDS_PER_DAY = 86_400;
const BEIJING_OFFSET_DAYS = 1 / 3;
const TWO_PI = Math.PI * 2;

const jieDefinition: Record<
  Jie,
  { longitudeDegrees: number; approximateMonth: number; approximateDay: number }
> = {
  "立春": { longitudeDegrees: 315, approximateMonth: 2, approximateDay: 4 },
  "惊蛰": { longitudeDegrees: 345, approximateMonth: 3, approximateDay: 6 },
  "清明": { longitudeDegrees: 15, approximateMonth: 4, approximateDay: 5 },
  "立夏": { longitudeDegrees: 45, approximateMonth: 5, approximateDay: 6 },
  "芒种": { longitudeDegrees: 75, approximateMonth: 6, approximateDay: 6 },
  "小暑": { longitudeDegrees: 105, approximateMonth: 7, approximateDay: 7 },
  "立秋": { longitudeDegrees: 135, approximateMonth: 8, approximateDay: 8 },
  "白露": { longitudeDegrees: 165, approximateMonth: 9, approximateDay: 8 },
  "寒露": { longitudeDegrees: 195, approximateMonth: 10, approximateDay: 8 },
  "立冬": { longitudeDegrees: 225, approximateMonth: 11, approximateDay: 7 },
  "大雪": { longitudeDegrees: 255, approximateMonth: 12, approximateDay: 7 },
  "小寒": { longitudeDegrees: 285, approximateMonth: 1, approximateDay: 6 },
};

function continuousSolarLongitude(year: number, jie: Jie): number {
  const definition = jieDefinition[jie];
  const target = definition.longitudeDegrees * Math.PI / 180;
  const approximateJ2000Days =
    julianDayFromFields(
      year,
      definition.approximateMonth,
      definition.approximateDay,
      12,
      0,
      0,
    ) - J2000;
  const approximateLongitude =
    4.8950632 + 628.3319653318 * (approximateJ2000Days / 36525);
  const cycle = Math.round((approximateLongitude - target) / TWO_PI);
  return target + cycle * TWO_PI;
}

function calendarFieldsFromJulianDay(julianDay: number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  fractionalSecond: number;
} {
  let dayInteger = Math.floor(julianDay + 0.5);
  let fraction = julianDay + 0.5 - dayInteger;
  if (dayInteger >= 2299161) {
    const century = Math.floor((dayInteger - 1867216.25) / 36524.25);
    dayInteger += 1 + century - Math.floor(century / 4);
  }
  dayInteger += 1524;
  let year = Math.floor((dayInteger - 122.1) / 365.25);
  dayInteger -= Math.floor(365.25 * year);
  let month = Math.floor(dayInteger / 30.601);
  dayInteger -= Math.floor(30.601 * month);
  const day = dayInteger;
  if (month > 13) {
    month -= 13;
    year -= 4715;
  } else {
    month -= 1;
    year -= 4716;
  }
  fraction *= 24;
  const hour = Math.floor(fraction);
  fraction = (fraction - hour) * 60;
  const minute = Math.floor(fraction);
  const fractionalSecond = (fraction - minute) * 60;
  return { year, month, day, hour, minute, fractionalSecond };
}

function trueSolarDateTimeFromLocalJulianDay(
  localJulianDay: number,
  correctionSeconds = 0,
): TrueSolarDateTime {
  const fields = calendarFieldsFromJulianDay(localJulianDay);
  const roundedTimestamp = Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    0,
  ) + Math.round(
    (fields.fractionalSecond + correctionSeconds) * 1000,
  );
  const result = new Date(roundedTimestamp);
  return trueSolarDateTime({
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
    hour: result.getUTCHours(),
    minute: result.getUTCMinutes(),
    second: result.getUTCSeconds(),
    millisecond: result.getUTCMilliseconds(),
  });
}

export function trueSolarJieMoment(
  year: number,
  jie: Jie,
  longitude?: number,
): TrueSolarDateTime {
  if (!Number.isInteger(year)) {
    throw new RangeError(`year 必须是整数：${String(year)}`);
  }
  if (
    longitude !== undefined
    && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
  ) {
    throw new RangeError(`longitude 须在 -180–180：${String(longitude)}`);
  }
  const localJ2000Days = solarLongitudeMomentBeijingDays(
    continuousSolarLongitude(year, jie),
  );
  if (longitude === undefined) {
    return trueSolarDateTimeFromLocalJulianDay(localJ2000Days + J2000);
  }
  const universalJ2000Days = localJ2000Days - BEIJING_OFFSET_DAYS;
  const correctionSeconds =
    (longitude - 120) * 240
    + equationOfTimeDays(universalJ2000Days) * SECONDS_PER_DAY;
  return trueSolarDateTimeFromLocalJulianDay(
    localJ2000Days + J2000,
    correctionSeconds,
  );
}

export function toTrueSolarDateTime(
  clockTime: BeijingDateTime,
  longitude: number | undefined,
): TrueSolarDateTime {
  if (longitude === undefined) {
    return trueSolarDateTime({ ...clockTime, millisecond: 0 });
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError(`longitude 须在 -180–180：${String(longitude)}`);
  }
  const clockLocalJ2000Days =
    julianDayFromFields(
      clockTime.year,
      clockTime.month,
      clockTime.day,
      clockTime.hour,
      clockTime.minute,
      clockTime.second,
    ) - J2000;
  const universalJ2000Days = clockLocalJ2000Days - BEIJING_OFFSET_DAYS;
  const longitudeCorrectionSeconds = (longitude - 120) * 240;
  const equationOfTimeSeconds =
    equationOfTimeDays(universalJ2000Days) * SECONDS_PER_DAY;
  const roundedTimestamp = Math.round(
    dateTimeTimestamp(clockTime)
      + (longitudeCorrectionSeconds + equationOfTimeSeconds) * 1000,
  );
  const result = new Date(roundedTimestamp);
  return trueSolarDateTime({
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
    hour: result.getUTCHours(),
    minute: result.getUTCMinutes(),
    second: result.getUTCSeconds(),
    millisecond: result.getUTCMilliseconds(),
  });
}
