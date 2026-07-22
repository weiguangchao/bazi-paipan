import ts from "typescript-compiler-api";
import { checkCoveredIdentifiers, runIdentifierCheck } from "./identifier-check-runner.mjs";

export function findNonAsciiIdentifiers(source, fileName = "fixture.ts") {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const violations = [];

  function visit(node) {
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
      const identifier = String(node.escapedText);
      if (/[^\x00-\x7F]/.test(identifier)) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        violations.push({ identifier, line: position.line + 1, column: position.character + 1 });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

export function formatViolation(file, violation) {
  return `${file}:${violation.line}:${violation.column} non-ASCII identifier ${violation.identifier}`;
}

export function checkAsciiIdentifiers(root = process.cwd()) {
  checkCoveredIdentifiers(root, findNonAsciiIdentifiers, formatViolation);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runIdentifierCheck(checkAsciiIdentifiers);
}
