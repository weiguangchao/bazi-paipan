import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript-compiler-api";

const executableExtensions = new Set([".ts", ".js", ".cjs", ".mjs"]);
const ignoredPaths = new Set(["src/data/cities.generated.ts"]);

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const file = path.join(directory, entry);
    return statSync(file).isDirectory() ? collectFiles(file) : [file];
  });
}

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
  const files = ["src", "test", "scripts", "public"]
    .flatMap((directory) => collectFiles(path.join(root, directory)))
    .filter((file) => executableExtensions.has(path.extname(file)))
    .filter((file) => !ignoredPaths.has(path.relative(root, file)));
  const messages = files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return findNonAsciiIdentifiers(source, file).map((violation) => formatViolation(path.relative(root, file), violation));
  });
  if (messages.length) throw new Error(messages.join("\n"));
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    checkAsciiIdentifiers();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
