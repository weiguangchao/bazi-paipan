export interface BirthDateParts {
  year: number;
  month: number;
  day: number;
}

export function parseBirthDate(value: unknown): BirthDateParts | null;
export function getBirthDateLimit(nowMs: number): BirthDateParts;
export function isAfterBirthDateLimit(birthDate: BirthDateParts, nowMs: number): boolean;
