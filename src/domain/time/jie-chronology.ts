import {
  JIE_NAMES,
  jieMoment,
  trueSolarJieMoment,
  type Jie,
} from "@/domain/time/astronomy";
import {
  compareDateTime,
  type BeijingDateTime,
  type DateTimeFields,
  type TrueSolarDateTime,
} from "@/domain/time/date-time";

export interface JieOccurrence {
  readonly jie: Jie;
  readonly moment: BeijingDateTime;
}

export interface JieInterval {
  readonly lichunYear: number;
  readonly start: JieOccurrence;
  readonly end: JieOccurrence;
}

export interface JieLocation {
  readonly interval: JieInterval;
  readonly strictEarlier: JieOccurrence;
  readonly strictLater: JieOccurrence;
}

export interface TrueSolarJieOccurrence {
  readonly jie: Jie;
  readonly moment: TrueSolarDateTime;
}

export interface TrueSolarJieInterval {
  readonly lichunYear: number;
  readonly start: TrueSolarJieOccurrence;
  readonly end: TrueSolarJieOccurrence;
}

export interface TrueSolarJieLocation {
  readonly interval: TrueSolarJieInterval;
  readonly strictEarlier: TrueSolarJieOccurrence;
  readonly strictLater: TrueSolarJieOccurrence;
}

function lichunCycleOccurrence(
  lichunYear: number,
  jie: Jie,
): JieOccurrence {
  const calendarYear = jie === "小寒" ? lichunYear + 1 : lichunYear;
  return { jie, moment: jieMoment(calendarYear, jie) };
}

function calendarMonthOccurrence(
  calendarYear: number,
  calendarMonth: number,
): JieOccurrence {
  const jieIndex = (calendarMonth + JIE_NAMES.length - 2) % JIE_NAMES.length;
  const jie = JIE_NAMES[jieIndex]!;
  return { jie, moment: jieMoment(calendarYear, jie) };
}

function trueSolarCalendarMonthOccurrence(
  calendarYear: number,
  calendarMonth: number,
  longitude: number | undefined,
): TrueSolarJieOccurrence {
  const jieIndex = (calendarMonth + JIE_NAMES.length - 2) % JIE_NAMES.length;
  const jie = JIE_NAMES[jieIndex]!;
  return {
    jie,
    moment: trueSolarJieMoment(calendarYear, jie, longitude),
  };
}

function trueSolarLichunCycleOccurrence(
  lichunYear: number,
  jie: Jie,
  longitude: number | undefined,
): TrueSolarJieOccurrence {
  const calendarYear = jie === "小寒" ? lichunYear + 1 : lichunYear;
  return {
    jie,
    moment: trueSolarJieMoment(calendarYear, jie, longitude),
  };
}

export function jieIntervals(lichunYear: number): readonly JieInterval[] {
  if (!Number.isInteger(lichunYear)) {
    throw new RangeError(`lichunYear 必须是整数：${String(lichunYear)}`);
  }

  const occurrences = JIE_NAMES.map((jie) =>
    lichunCycleOccurrence(lichunYear, jie),
  );
  const nextLichun = lichunCycleOccurrence(lichunYear + 1, "立春");

  return occurrences.map((start, index) => ({
    lichunYear,
    start,
    end: occurrences[index + 1] ?? nextLichun,
  }));
}

export function trueSolarJieIntervals(
  lichunYear: number,
  longitude?: number,
): readonly TrueSolarJieInterval[] {
  if (!Number.isInteger(lichunYear)) {
    throw new RangeError(`lichunYear 必须是整数：${String(lichunYear)}`);
  }

  const occurrences = JIE_NAMES.map((jie) =>
    trueSolarLichunCycleOccurrence(lichunYear, jie, longitude),
  );
  const nextLichun = trueSolarLichunCycleOccurrence(
    lichunYear + 1,
    "立春",
    longitude,
  );

  return occurrences.map((start, index) => ({
    lichunYear,
    start,
    end: occurrences[index + 1] ?? nextLichun,
  }));
}

export function locateJie(moment: BeijingDateTime): JieLocation {
  return locateJieByCalendarMonth(moment, calendarMonthOccurrence);
}

function locateJieByCalendarMonth<T extends {
  readonly jie: Jie;
  readonly moment: DateTimeFields;
}>(
  moment: DateTimeFields,
  occurrence: (calendarYear: number, calendarMonth: number) => T,
): {
  readonly interval: {
    readonly lichunYear: number;
    readonly start: T;
    readonly end: T;
  };
  readonly strictEarlier: T;
  readonly strictLater: T;
} {
  const previousMonth = moment.month === 1 ? 12 : moment.month - 1;
  const previousYear = moment.month === 1 ? moment.year - 1 : moment.year;
  const nextMonth = moment.month === 12 ? 1 : moment.month + 1;
  const nextYear = moment.month === 12 ? moment.year + 1 : moment.year;
  const previous = occurrence(previousYear, previousMonth);
  const boundary = occurrence(moment.year, moment.month);
  const next = occurrence(nextYear, nextMonth);
  const comparison = compareDateTime(moment, boundary.moment);
  const start = comparison < 0 ? previous : boundary;
  const end = comparison < 0 ? boundary : next;
  const lichunYear = start.jie === "小寒"
    ? start.moment.year - 1
    : start.moment.year;

  return {
    interval: { lichunYear, start, end },
    strictEarlier: comparison <= 0 ? previous : boundary,
    strictLater: comparison < 0 ? boundary : next,
  };
}

export function locateTrueSolarJie(
  moment: TrueSolarDateTime,
  longitude?: number,
): TrueSolarJieLocation {
  return locateJieByCalendarMonth(
    moment,
    (calendarYear, calendarMonth) =>
      trueSolarCalendarMonthOccurrence(calendarYear, calendarMonth, longitude),
  );
}
