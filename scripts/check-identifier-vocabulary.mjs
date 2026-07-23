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
  "$",
  "$$",
  "$eval",
  "$$eval",
  "click",
  "closest",
  "fill",
  "focus",
  "getAttribute",
  "hover",
  "innerHTML",
  "innerText",
  "inputValue",
  "isChecked",
  "isDisabled",
  "isEditable",
  "isEnabled",
  "isHidden",
  "isVisible",
  "locator",
  "matches",
  "press",
  "querySelector",
  "querySelectorAll",
  "selectOption",
  "setChecked",
  "setInputFiles",
  "tap",
  "textContent",
  "type",
  "uncheck",
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

export function findDeprecatedVocabularyIdentifiers(source, fileName = "fixture.ts") {
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

function findDeprecatedSelectorNamings(selector) {
  const namings = [];
  const seen = new Set();
  const namingSelector = selector.replace(
    /(^|>>)(\s*text\s*=\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|.*?)(?=\s*>>|$)/gi,
    (textSelector, prefix) =>
      prefix + textSelector.slice(prefix.length).replace(/[^\n]/g, " "),
  );

  function add(naming, index) {
    const key = `${index}:${naming}`;
    if (seen.has(key)) return;
    seen.add(key);
    namings.push({ naming, index });
  }

  for (const attributeMatch of namingSelector.matchAll(
    /\[\s*([-\w]+)[^\]]*?=\s*(?:"([^"]*)"|'([^']*)')/g,
  )) {
    const attributeName = attributeMatch[1].toLowerCase();
    if (
      attributeName !== "class"
      && attributeName !== "id"
      && !attributeName.startsWith("data-")
    ) {
      continue;
    }
    const value = attributeMatch[2] ?? attributeMatch[3] ?? "";
    const valueOffset = attributeMatch[0].indexOf(value);
    for (const valueMatch of value.matchAll(/[-\w]*pillar[-\w]*/gi)) {
      add(valueMatch[0], attributeMatch.index + valueOffset + valueMatch.index);
    }
  }

  const unquotedSelector = namingSelector.replace(
    /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    (quoted) => quoted.replace(/[^\n]/g, " "),
  );
  for (const namingMatch of unquotedSelector.matchAll(/[-\w]*pillar[-\w]*/gi)) {
    const prefixIndex = namingMatch.index - 1;
    const prefix = prefixIndex >= 0 && /[.#:]/.test(unquotedSelector[prefixIndex])
      ? unquotedSelector[prefixIndex]
      : "";
    add(prefix + namingMatch[0], namingMatch.index - prefix.length);
  }

  return namings.sort((left, right) => left.index - right.index);
}

function findDeprecatedVocabularyDomSelectors(source, fileName) {
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
        const namings = cssSelectorMethods.has(methodName)
          ? findDeprecatedSelectorNamings(selector)
          : directDomNameMethods.has(methodName)
            ? [...selector.matchAll(/[-\w]*pillar[-\w]*/gi)].map((match) => ({
                naming: match[0],
                index: match.index,
              }))
            : [];
        for (const namingMatch of namings) {
          const deprecatedMatch = /pillar/i.exec(namingMatch.naming);
          const position = sourceFile.getLineAndCharacterOfPosition(
            firstArgument.getStart(sourceFile) + 1 + namingMatch.index,
          );
          violations.push({
            identifier: namingMatch.naming,
            context: "DOM selector",
            naming: namingMatch.naming,
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

function findDeprecatedVocabularyHtmlNaming(source) {
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

function findDeprecatedVocabularyCssNaming(source) {
  const searchable = maskComments(source, /\/\*[\s\S]*?\*\//g);
  const violations = [];

  for (const ruleMatch of searchable.matchAll(/([^{}]+)\{/g)) {
    const selector = ruleMatch[1];
    if (selector.trimStart().startsWith("@")) continue;
    for (const namingMatch of findDeprecatedSelectorNamings(selector)) {
      const deprecatedMatch = /pillar/i.exec(namingMatch.naming);
      const index = ruleMatch.index + namingMatch.index;
      violations.push({
        identifier: namingMatch.naming,
        context: "CSS selector",
        naming: namingMatch.naming,
        deprecatedToken: deprecatedMatch[0],
        canonicalToken: "zhu",
        ...sourcePosition(source, index),
      });
    }
  }
  return violations;
}

export function findDeprecatedVocabularyNaming(source, fileName = "fixture.ts") {
  const normalizedFileName = fileName.toLowerCase();
  if (normalizedFileName.endsWith(".html")) {
    return findDeprecatedVocabularyHtmlNaming(source);
  }
  if (normalizedFileName.endsWith(".css")) {
    return findDeprecatedVocabularyCssNaming(source);
  }
  return [
    ...findDeprecatedVocabularyIdentifiers(source, fileName),
    ...findDeprecatedVocabularyDomSelectors(source, fileName),
  ].sort((left, right) => left.line - right.line || left.column - right.column);
}

export function formatDeprecatedVocabularyViolation(file, violation) {
  if (violation.deprecatedToken.toLowerCase() === "pillar") {
    return `${file}:${violation.line}:${violation.column} deprecated domain token pillar in ${violation.context} ${violation.naming}; use zhu or a more specific canonical token`;
  }
  return `${file}:${violation.line}:${violation.column} deprecated pinyin token ${violation.deprecatedToken} in identifier ${violation.identifier}; use ${violation.canonicalToken}`;
}

export function checkIdentifierVocabulary(root = process.cwd()) {
  checkCoveredNaming(root, findDeprecatedVocabularyNaming, formatDeprecatedVocabularyViolation);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runIdentifierCheck(checkIdentifierVocabulary);
}
