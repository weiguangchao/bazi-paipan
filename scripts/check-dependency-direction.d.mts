export interface DependencyViolation {
  specifier: string;
  fromLayer: string;
  toLayer: string;
  allowed: string[];
  line: number;
  column: number;
}

export function findDependencyViolations(
  source: string,
  fileName?: string,
): DependencyViolation[];

export function formatViolation(
  file: string,
  violation: DependencyViolation,
): string;

export function checkDependencyDirection(root?: string): void;
