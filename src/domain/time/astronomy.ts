import {
  dateTimeTimestamp,
  derivedBeijingDateTime,
  trueSolarDateTime,
  type BeijingDateTime,
  type DateTimeFields,
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
const JULIAN_UNIX_EPOCH = 2440587.5;
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

function fieldsFromLocalJulianDay(localJulianDay: number): DateTimeFields {
  const roundedUnixSeconds = Math.round(
    (localJulianDay - JULIAN_UNIX_EPOCH) * SECONDS_PER_DAY,
  );
  const date = new Date(roundedUnixSeconds * 1000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

export function jieMoment(year: number, jie: Jie): BeijingDateTime {
  if (!Number.isInteger(year)) {
    throw new RangeError(`year 必须是整数：${String(year)}`);
  }
  const localJ2000Days = solarLongitudeMomentBeijingDays(
    continuousSolarLongitude(year, jie),
  );
  return derivedBeijingDateTime(fieldsFromLocalJulianDay(localJ2000Days + J2000));
}

export function toTrueSolarDateTime(
  clockTime: BeijingDateTime,
  longitude: number | undefined,
): TrueSolarDateTime {
  if (longitude === undefined) {
    return trueSolarDateTime(clockTime, false);
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
    dateTimeTimestamp(clockTime) / 1000
      + longitudeCorrectionSeconds
      + equationOfTimeSeconds,
  ) * 1000;
  const result = new Date(roundedTimestamp);
  return trueSolarDateTime({
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
    hour: result.getUTCHours(),
    minute: result.getUTCMinutes(),
    second: result.getUTCSeconds(),
  }, true);
}
