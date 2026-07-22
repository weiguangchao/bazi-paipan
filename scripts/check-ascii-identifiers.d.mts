export interface IdentifierViolation {
  identifier: string;
  line: number;
  column: number;
}

export function findNonAsciiIdentifiers(source: string, fileName?: string): IdentifierViolation[];
export function formatViolation(file: string, violation: IdentifierViolation): string;
export function checkAsciiIdentifiers(root?: string): void;
