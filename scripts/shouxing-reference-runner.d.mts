export interface ReferenceDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface ReferenceJieDateTime extends ReferenceDateTime {
  millisecond: number;
}

export function referenceJieMoment(
  year: number,
  jie: string,
): ReferenceJieDateTime;

export function referenceEquationOfTimeSeconds(
  fields: ReferenceDateTime,
): number;
