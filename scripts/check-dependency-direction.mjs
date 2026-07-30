import ts from "typescript-compiler-api";
import path from "node:path";
import { checkCoveredIdentifiers, runIdentifierCheck } from "./identifier-check-runner.mjs";

// 声明式分层依赖方向表（落地 #115 决议）。
// 来源：issues #115 / #116。#116 验收要求「对当前仓库（已符合分层）跑过 exit 0」，
// 故相对 #115 原表按其「落地时再精化」预期作如下精化：
//   - domain -> data：birthplace 消费 cities.generated，data 为横切数据层
//   - utils  -> domain：wuxing 消费 domain 纯函数/类型；domain 是纯核，非 app/components/pages 等上游消费层。
//     此边偏离 #115 原表「utils 为叶子工具层」的字面表述，是 #116 验收项 1（对当前仓 exit 0）
//     与仓内现状（src/utils/wuxing.ts 已消费 domain）共同决定的必要精化；若后续将 wuxing 归核入 domain，
//     应同步收回此边。
// 其余严格忠于 #115：domain 不得指向 app/components/pages/utils/lib；
// utils 不得指向 app/components/pages（上游消费层）；lib 为叶子横切层。
// 目标层分类 fail closed：任何落在 src/ 内但未声明的首段（如 src/hooks/）一律判违规，
// 使新增分层必须同步更新本表（见 #115「未来变更分层需同步改守卫」）。
const ALLOWED_DEPENDENCIES = {
  app: new Set(["app", "books", "pages", "domain", "lib", "data"]),
  books: new Set(["books"]),
  pages: new Set(["pages", "domain", "components", "utils", "lib", "data"]),
  components: new Set(["components", "utils", "domain", "lib", "data"]),
  domain: new Set(["domain", "data"]),
  utils: new Set(["utils", "domain"]),
  lib: new Set(["lib"]),
  data: new Set(["data"]),
};

const LAYERS = ["app", "books", "pages", "components", "domain", "utils", "lib", "data"];
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".mts",
  ".cts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
]);

function moduleSpecifierText(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
}

// 任意 in-src 路径的原始首段（声明层或未声明层皆返回），src/ 外返回 null。
// 用于 import 目标分类，使未声明层（如 src/hooks/）fail closed 而非被静默跳过。
function rawLayerOfPath(filePath) {
  const normalized = String(filePath).replace(/\\/g, "/");
  const marker = "/src/";
  let rest = "";
  const absoluteIndex = normalized.lastIndexOf(marker);
  if (absoluteIndex !== -1) {
    rest = normalized.slice(absoluteIndex + marker.length);
  } else if (normalized.startsWith("src/")) {
    rest = normalized.slice("src/".length);
  } else {
    return null;
  }
  if (rest === "") return null;
  const firstSegment = rest.includes("/") ? rest.slice(0, rest.indexOf("/")) : "";
  // src/ 直挂文件（如 main.tsx）归入 app 层（应用组合根）。
  if (firstSegment === "") return "app";
  return firstSegment;
}

// 导入方所在层：仅守声明层；未声明 src/ 目录的文件不参与守卫（避免误报与崩溃）。
function fromLayerOfPath(filePath) {
  const layer = rawLayerOfPath(filePath);
  return layer !== null && LAYERS.includes(layer) ? layer : null;
}

function targetLayerOfSpecifier(specifier, importingFile) {
  if (specifier.startsWith("@/")) {
    const rest = specifier.slice(2);
    if (rest === "") return null;
    const firstSegment = rest.includes("/") ? rest.slice(0, rest.indexOf("/")) : rest;
    // 不按 LAYERS 过滤：未声明层（如 @/hooks/...）原样返回，交由允许集 fail closed。
    return firstSegment;
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    // 先解析再取扩展名：相对前缀 ../.. 的点不应被 lastIndexOf 误读为扩展名分隔符，
    // 否则扩展名缺省的越层相对引用（如 "../../components/ui/button"）会被静默跳过。
    const resolved = path
      .resolve(path.dirname(importingFile), specifier)
      .replace(/\\/g, "/");
    const extension = path.extname(resolved);
    if (extension && !SOURCE_EXTENSIONS.has(extension)) return null;
    return rawLayerOfPath(resolved);
  }
  return null;
}

function collectImportSpecifiers(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const specifiers = [];

  function recordSpecifier(expressionNode) {
    const specifier = moduleSpecifierText(expressionNode);
    if (!specifier) return;
    const position = sourceFile.getLineAndCharacterOfPosition(expressionNode.getStart(sourceFile));
    specifiers.push({ specifier, line: position.line + 1, column: position.character + 1 });
  }

  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      recordSpecifier(node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      recordSpecifier(node.moduleSpecifier);
    } else if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length > 0
    ) {
      recordSpecifier(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function exportedLegacyJieFacadePosition(source, fileName) {
  const normalizedFile = String(fileName).replace(/\\/g, "/");
  if (!normalizedFile.endsWith("src/domain/time/astronomy.ts")) return null;
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  let position = null;
  const isExported = (node) =>
    node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

  function record(node) {
    if (position !== null) return;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    position = { line: start.line + 1, column: start.character + 1 };
  }

  function visit(node) {
    if (
      ts.isFunctionDeclaration(node)
      && isExported(node)
      && node.name?.text === "jieMoment"
    ) {
      record(node.name);
    } else if (ts.isVariableStatement(node) && isExported(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === "jieMoment") {
          record(declaration.name);
        }
      }
    } else if (ts.isExportDeclaration(node) && node.exportClause
      && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        if (element.name.text === "jieMoment") record(element.name);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return position;
}

export function findDependencyViolations(source, fileName = "fixture.ts") {
  const fromLayer = fromLayerOfPath(fileName);
  if (!fromLayer) return [];
  const allowed = ALLOWED_DEPENDENCIES[fromLayer];
  const violations = [];
  const legacyJieFacade = exportedLegacyJieFacadePosition(source, fileName);
  if (legacyJieFacade) {
    violations.push({
      specifier: "jieMoment",
      fromLayer,
      toLayer: "legacy-beijing-jie-facade",
      allowed: ["trueSolarJieMoment facade"],
      ...legacyJieFacade,
    });
  }
  for (const { specifier, line, column } of collectImportSpecifiers(source, fileName)) {
    const normalizedFile = String(fileName).replace(/\\/g, "/");
    const importsPrivateShouxingCore =
      specifier.includes("/domain/time/shouxing/")
      || specifier.includes("../time/shouxing/")
      || specifier.startsWith("./shouxing/");
    if (
      importsPrivateShouxingCore
      && !normalizedFile.endsWith("/src/domain/time/astronomy.ts")
      && normalizedFile !== "src/domain/time/astronomy.ts"
    ) {
      violations.push({
        specifier,
        fromLayer,
        toLayer: "private-shouxing-core",
        allowed: ["src/domain/time/astronomy.ts facade"],
        line,
        column,
      });
      continue;
    }
    if (specifier.includes("test/oracles") || specifier.includes("/oracles/")) {
      violations.push({
        specifier,
        fromLayer,
        toLayer: "test-oracle",
        allowed: [...allowed],
        line,
        column,
      });
      continue;
    }
    const toLayer = targetLayerOfSpecifier(specifier, fileName);
    if (!toLayer) continue;
    if (!allowed.has(toLayer)) {
      violations.push({ specifier, fromLayer, toLayer, allowed: [...allowed], line, column });
    }
  }
  return violations;
}

export function formatViolation(file, violation) {
  return (
    `${file}:${violation.line}:${violation.column} forbidden dependency direction `
    + `${violation.fromLayer} -> ${violation.toLayer} via ${violation.specifier}; `
    + `allowed targets for ${violation.fromLayer}: ${violation.allowed.join(", ")}`
  );
}

export function checkDependencyDirection(root = process.cwd()) {
  checkCoveredIdentifiers(root, findDependencyViolations, formatViolation);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runIdentifierCheck(checkDependencyDirection);
}
