import ts from "typescript-compiler-api";
import { checkCoveredIdentifiers, runIdentifierCheck } from "./identifier-check-runner.mjs";

const deprecatedPinyinTokens = new Map([
  ["siZhu", "sizhu"],
  ["SiZhu", "sizhu"],
  ["ganZhi", "ganzhi"],
  ["GanZhi", "ganzhi"],
  ["shiShen", "shishen"],
  ["ShiShen", "shishen"],
  ["cangGan", "canggan"],
  ["CangGan", "canggan"],
  ["qiYun", "qiyun"],
  ["QiYun", "qiyun"],
]);

export function findDeprecatedPinyinIdentifiers(source, fileName = "fixture.ts") {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const violations = [];

  function visit(node) {
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
      const identifier = String(node.escapedText);
      for (const [deprecatedToken, canonicalToken] of deprecatedPinyinTokens) {
        if (!identifier.includes(deprecatedToken)) continue;
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        violations.push({
          identifier,
          deprecatedToken,
          canonicalToken,
          line: position.line + 1,
          column: position.character + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

export function formatDeprecatedPinyinViolation(file, violation) {
  return `${file}:${violation.line}:${violation.column} deprecated pinyin token ${violation.deprecatedToken} in identifier ${violation.identifier}; use ${violation.canonicalToken}`;
}

export function checkIdentifierVocabulary(root = process.cwd()) {
  checkCoveredIdentifiers(root, findDeprecatedPinyinIdentifiers, formatDeprecatedPinyinViolation);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runIdentifierCheck(checkIdentifierVocabulary);
}
