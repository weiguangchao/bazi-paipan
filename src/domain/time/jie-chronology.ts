import {
  JIE_NAMES,
  trueSolarJieMoment,
  type Jie,
} from "@/domain/time/astronomy";
import {
  compareDateTime,
  type TrueSolarDateTime,
} from "@/domain/time/date-time";

export interface JieOccurrence {
  readonly jie: Jie;
  readonly moment: TrueSolarDateTime;
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

function lichunCycleOccurrence(
  lichunYear: number,
  jie: Jie,
  longitude: number | undefined,
): JieOccurrence {
  const calendarYear = jie === "小寒" ? lichunYear + 1 : lichunYear;
  return {
    jie,
    moment: trueSolarJieMoment(calendarYear, jie, longitude),
  };
}

function calendarMonthOccurrence(
  calendarYear: number,
  calendarMonth: number,
  longitude: number | undefined,
): JieOccurrence {
  const jieIndex = (calendarMonth + JIE_NAMES.length - 2) % JIE_NAMES.length;
  const jie = JIE_NAMES[jieIndex]!;
  return {
    jie,
    moment: trueSolarJieMoment(calendarYear, jie, longitude),
  };
}

export function jieIntervals(
  lichunYear: number,
  longitude?: number,
): readonly JieInterval[] {
  if (!Number.isInteger(lichunYear)) {
    throw new RangeError(`lichunYear 必须是整数：${String(lichunYear)}`);
  }

  const occurrences = JIE_NAMES.map((jie) =>
    lichunCycleOccurrence(lichunYear, jie, longitude),
  );
  const nextLichun = lichunCycleOccurrence(lichunYear + 1, "立春", longitude);

  return occurrences.map((start, index) => ({
    lichunYear,
    start,
    end: occurrences[index + 1] ?? nextLichun,
  }));
}

export function locateJie(
  moment: TrueSolarDateTime,
  longitude?: number,
): JieLocation {
  const previousMonth = moment.month === 1 ? 12 : moment.month - 1;
  const previousYear = moment.month === 1 ? moment.year - 1 : moment.year;
  const nextMonth = moment.month === 12 ? 1 : moment.month + 1;
  const nextYear = moment.month === 12 ? moment.year + 1 : moment.year;
  const previous = calendarMonthOccurrence(previousYear, previousMonth, longitude);
  const boundary = calendarMonthOccurrence(moment.year, moment.month, longitude);
  const next = calendarMonthOccurrence(nextYear, nextMonth, longitude);
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
