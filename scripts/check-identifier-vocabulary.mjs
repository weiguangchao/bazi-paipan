import ts from "typescript-compiler-api";
import { checkCoveredNaming, runIdentifierCheck } from "./identifier-check-runner.mjs";

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
const cssSelectorMethods = new Set([
  "$eval",
  "$$eval",
  "click",
  "closest",
  "fill",
  "inputValue",
  "isVisible",
  "locator",
  "matches",
  "querySelector",
  "querySelectorAll",
  "selectOption",
  "textContent",
  "waitForSelector",
]);
const directDomNameMethods = new Set(["getElementById", "getElementsByClassName"]);

function sourcePosition(source, index) {
  const preceding = source.slice(0, index);
  const lines = preceding.split("\n");
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

function maskComments(source, pattern) {
  return source.replace(pattern, (comment) => comment.replace(/[^\n]/g, " "));
}

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
      const deprecatedMatch = /pillar/i.exec(identifier);
      if (deprecatedMatch) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        violations.push({
          identifier,
          context: "identifier",
          naming: identifier,
          deprecatedToken: deprecatedMatch[0],
          canonicalToken: "zhu",
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

function calledMethodName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return undefined;
}

function findDeprecatedPinyinDomSelectors(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const violations = [];

  function visit(node) {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const methodName = calledMethodName(node.expression);
      const firstArgument = node.arguments[0];
      if (
        methodName
        && (ts.isStringLiteral(firstArgument) || ts.isNoSubstitutionTemplateLiteral(firstArgument))
      ) {
        const selector = firstArgument.text;
        const matches = cssSelectorMethods.has(methodName)
          ? selector.matchAll(/[.#][-\w]*pillar[-\w]*/gi)
          : directDomNameMethods.has(methodName)
            ? selector.matchAll(/[-\w]*pillar[-\w]*/gi)
            : [];
        for (const namingMatch of matches) {
          const deprecatedMatch = /pillar/i.exec(namingMatch[0]);
          const position = sourceFile.getLineAndCharacterOfPosition(
            firstArgument.getStart(sourceFile) + 1 + namingMatch.index,
          );
          violations.push({
            identifier: namingMatch[0],
            context: "DOM selector",
            naming: namingMatch[0],
            deprecatedToken: deprecatedMatch[0],
            canonicalToken: "zhu",
            line: position.line + 1,
            column: position.character + 1,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function findDeprecatedPinyinHtmlNaming(source) {
  const searchable = maskComments(source, /<!--[\s\S]*?-->/g);
  const violations = [];
  const attributePattern = /\b(class|id)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

  for (const attributeMatch of searchable.matchAll(attributePattern)) {
    const attributeName = attributeMatch[1].toLowerCase();
    const value = attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? "";
    const valueOffset = attributeMatch[0].indexOf(value);
    for (const namingMatch of value.matchAll(/[^\s]+/g)) {
      const deprecatedMatch = /pillar/i.exec(namingMatch[0]);
      if (!deprecatedMatch) continue;
      const index = attributeMatch.index + valueOffset + namingMatch.index;
      violations.push({
        identifier: namingMatch[0],
        context: `HTML ${attributeName}`,
        naming: namingMatch[0],
        deprecatedToken: deprecatedMatch[0],
        canonicalToken: "zhu",
        ...sourcePosition(source, index),
      });
    }
  }
  return violations;
}

function findDeprecatedPinyinCssNaming(source) {
  const searchable = maskComments(source, /\/\*[\s\S]*?\*\//g);
  const violations = [];

  for (const ruleMatch of searchable.matchAll(/([^{}]+)\{/g)) {
    const selector = ruleMatch[1];
    if (selector.trimStart().startsWith("@")) continue;
    for (const namingMatch of selector.matchAll(/[.#][-\w]*pillar[-\w]*/gi)) {
      const deprecatedMatch = /pillar/i.exec(namingMatch[0]);
      const index = ruleMatch.index + namingMatch.index;
      violations.push({
        identifier: namingMatch[0],
        context: "CSS selector",
        naming: namingMatch[0],
        deprecatedToken: deprecatedMatch[0],
        canonicalToken: "zhu",
        ...sourcePosition(source, index),
      });
    }
  }
  return violations;
}

export function findDeprecatedPinyinNaming(source, fileName = "fixture.ts") {
  const normalizedFileName = fileName.toLowerCase();
  if (normalizedFileName.endsWith(".html")) {
    return findDeprecatedPinyinHtmlNaming(source);
  }
  if (normalizedFileName.endsWith(".css")) {
    return findDeprecatedPinyinCssNaming(source);
  }
  return [
    ...findDeprecatedPinyinIdentifiers(source, fileName),
    ...findDeprecatedPinyinDomSelectors(source, fileName),
  ].sort((left, right) => left.line - right.line || left.column - right.column);
}

export function formatDeprecatedPinyinViolation(file, violation) {
  if (violation.deprecatedToken.toLowerCase() === "pillar") {
    return `${file}:${violation.line}:${violation.column} deprecated domain token pillar in ${violation.context} ${violation.naming}; use zhu or a more specific canonical token`;
  }
  return `${file}:${violation.line}:${violation.column} deprecated pinyin token ${violation.deprecatedToken} in identifier ${violation.identifier}; use ${violation.canonicalToken}`;
}

export function checkIdentifierVocabulary(root = process.cwd()) {
  checkCoveredNaming(root, findDeprecatedPinyinNaming, formatDeprecatedPinyinViolation);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runIdentifierCheck(checkIdentifierVocabulary);
}
