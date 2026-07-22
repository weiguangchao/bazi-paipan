import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const executableExtensions = new Set([".ts", ".js", ".cjs", ".mjs"]);
const ignoredPaths = new Set(["src/data/cities.generated.ts", "scripts/scrape-wenzhen.ts"]);
const identifierStart = /[\p{L}_$]/u;
const identifierPart = /[\p{L}\p{N}_$]/u;
const apostrophe = String.fromCharCode(39);
const backtick = String.fromCharCode(96);

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const file = path.join(directory, entry);
    return statSync(file).isDirectory() ? collectFiles(file) : [file];
  });
}

export function findNonAsciiIdentifiers(source) {
  const violations = [];
  let index = 0;
  let state = "code";
  let templateDepth = 0;

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];

    if (state === "code") {
      if (current === "/" && next === "/") {
        const end = source.indexOf("\n", index);
        index = end < 0 ? source.length : end;
        continue;
      }
      if (current === "/" && next === "*") {
        const end = source.indexOf("*/", index + 2);
        index = end < 0 ? source.length : end + 2;
        continue;
      }
      if (current === "/" && /[^\x00-\x7F]/.test(next ?? "")) {
        index++;
        while (index < source.length) {
          if (source[index] === "\\") index += 2;
          else if (source[index++] === "/") break;
        }
        continue;
      }
      if (current === apostrophe || current === "\"") {
        const quote = current;
        index++;
        while (index < source.length) {
          if (source[index] === "\\") index += 2;
          else if (source[index++] === quote) break;
        }
        continue;
      }
      if (current === backtick) {
        index++;
        while (index < source.length) {
          if (source[index] === "\\") index += 2;
          else if (source[index++] === backtick) break;
        }
        continue;
      }
      if (identifierStart.test(current)) {
        const start = index;
        index += current.length;
        while (index < source.length && identifierPart.test(source[index])) index += source[index].length;
        const identifier = source.slice(start, index);
        if (/[^\x00-\x7F]/.test(identifier)) violations.push({ identifier, offset: start });
        continue;
      }
      if (current === "{" && templateDepth > 0) templateDepth++;
      if (current === "}" && templateDepth > 0 && --templateDepth === 0) state = "template";
      index++;
      continue;
    }

    if (current === "\\") index += 2;
    else if (current === backtick) {
      index++;
      state = "code";
    } else if (current === "$" && next === "{") {
      index += 2;
      templateDepth = 1;
      state = "code";
    } else index++;
  }

  return violations;
}

export function formatViolation(file, source, violation) {
  const before = source.slice(0, violation.offset);
  const line = before.split("\n").length;
  const column = violation.offset - before.lastIndexOf("\n");
  return `${file}:${line}:${column} non-ASCII identifier ${violation.identifier}`;
}

export function checkAsciiIdentifiers(root = process.cwd()) {
  const files = ["src", "test", "scripts", "public"]
    .flatMap((directory) => collectFiles(path.join(root, directory)))
    .filter((file) => executableExtensions.has(path.extname(file)))
    .filter((file) => !ignoredPaths.has(path.relative(root, file)));
  const messages = files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return findNonAsciiIdentifiers(source).map((violation) => formatViolation(path.relative(root, file), source, violation));
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
