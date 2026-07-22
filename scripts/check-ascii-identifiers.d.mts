export interface IdentifierViolation {
  identifier: string;
  offset: number;
}

export function findNonAsciiIdentifiers(source: string): IdentifierViolation[];
export function formatViolation(file: string, source: string, violation: IdentifierViolation): string;
export function checkAsciiIdentifiers(root?: string): void;
