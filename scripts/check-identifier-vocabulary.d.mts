export interface DeprecatedVocabularyViolation {
  identifier: string;
  context?: string;
  naming?: string;
  deprecatedToken: string;
  canonicalToken: string;
  line: number;
  column: number;
}

export function findDeprecatedVocabularyIdentifiers(
  source: string,
  fileName?: string,
): DeprecatedVocabularyViolation[];
export function findDeprecatedVocabularyNaming(
  source: string,
  fileName?: string,
): DeprecatedVocabularyViolation[];
export function formatDeprecatedVocabularyViolation(file: string, violation: DeprecatedVocabularyViolation): string;
export function checkIdentifierVocabulary(root?: string): void;
