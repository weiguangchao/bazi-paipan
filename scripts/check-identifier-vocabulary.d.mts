export interface DeprecatedPinyinViolation {
  identifier: string;
  context?: string;
  naming?: string;
  deprecatedToken: string;
  canonicalToken: string;
  line: number;
  column: number;
}

export function findDeprecatedPinyinIdentifiers(
  source: string,
  fileName?: string,
): DeprecatedPinyinViolation[];
export function findDeprecatedPinyinNaming(
  source: string,
  fileName?: string,
): DeprecatedPinyinViolation[];
export function formatDeprecatedPinyinViolation(file: string, violation: DeprecatedPinyinViolation): string;
export function checkIdentifierVocabulary(root?: string): void;
