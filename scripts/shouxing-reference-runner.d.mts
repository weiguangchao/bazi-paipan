export interface ReferenceDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function referenceJieMoment(
  year: number,
  jie: string,
): ReferenceDateTime;

export function referenceEquationOfTimeSeconds(
  fields: ReferenceDateTime,
): number;
