import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const executableExtensions = new Set([".ts", ".js", ".cjs", ".mjs"]);
const namingExtensions = new Set([...executableExtensions, ".html", ".css"]);
const ignoredPaths = new Set(["src/data/cities.generated.ts"]);

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const file = path.join(directory, entry);
    return statSync(file).isDirectory() ? collectFiles(file) : [file];
  });
}

export function collectCoveredExecutableFiles(root = process.cwd()) {
  return ["src", "test", "scripts", "public"]
    .flatMap((directory) => collectFiles(path.join(root, directory)))
    .filter((file) => executableExtensions.has(path.extname(file)))
    .filter((file) => !ignoredPaths.has(path.relative(root, file)));
}

export function collectCoveredNamingFiles(root = process.cwd()) {
  return ["src", "test", "scripts", "public"]
    .flatMap((directory) => collectFiles(path.join(root, directory)))
    .filter((file) => namingExtensions.has(path.extname(file)))
    .filter((file) => !ignoredPaths.has(path.relative(root, file)));
}

function checkFiles(root, files, findViolations, formatViolation) {
  const messages = files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return findViolations(source, file).map((violation) =>
      formatViolation(path.relative(root, file), violation),
    );
  });
  if (messages.length) throw new Error(messages.join("\n"));
}

export function checkCoveredIdentifiers(root, findViolations, formatViolation) {
  checkFiles(
    root,
    collectCoveredExecutableFiles(root),
    findViolations,
    formatViolation,
  );
}

export function checkCoveredNaming(root, findViolations, formatViolation) {
  checkFiles(root, collectCoveredNamingFiles(root), findViolations, formatViolation);
}

export function runIdentifierCheck(check) {
  try {
    check();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
