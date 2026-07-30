import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  checkDependencyDirection,
  findDependencyViolations,
  formatViolation,
} from "../scripts/check-dependency-direction.mjs";

// 守卫规格见 issues #115 / #116。测试只经由公开导出（findDependencyViolations /
// formatViolation / checkDependencyDirection）观察行为，不触达内部实现。
// 命理术语遵循 CONTEXT.md（zhu / sizhu / ganzhi 等完整 token）。

describe("依赖方向守卫", () => {
  it("拒绝 domain 经 @/ alias 指向 components", () => {
    const source = 'import { Button } from "@/components/ui/button";';
    const [violation] = findDependencyViolations(source, "src/domain/paipan/leak.ts");
    expect(violation).toEqual(
      expect.objectContaining({
        fromLayer: "domain",
        toLayer: "components",
        specifier: "@/components/ui/button",
      }),
    );
  });

  it("拒绝 domain 经相对路径逃出 domain 子树（扩展名缺省）", () => {
    // 关键边界：相对路径 ../.. 的点不应被误读为扩展名分隔符，
    // 解析后落点为 components 层即判违规。
    const source = 'import { Button } from "../../components/ui/button";';
    const [violation] = findDependencyViolations(source, "src/domain/paipan/leak.ts");
    expect(violation).toEqual(
      expect.objectContaining({ fromLayer: "domain", toLayer: "components" }),
    );
  });

  it("拒绝 domain 经相对路径逃向未声明层（如 ../hooks/...）", () => {
    // 落地 #116「domain 内的相对路径不得解析出 domain 子树」：
    // 即使目标层尚未声明，只要解析落在 src/ 内且非 domain，即判 domain 越层。
    const source = 'import { useFoo } from "../../hooks/useFoo";';
    const [violation] = findDependencyViolations(source, "src/domain/paipan/leak.ts");
    expect(violation).toEqual(
      expect.objectContaining({ fromLayer: "domain", toLayer: "hooks" }),
    );
  });

  it("拒绝 domain 经 @/ alias 逃向未声明层", () => {
    const source = 'import { useFoo } from "@/hooks/useFoo";';
    const [violation] = findDependencyViolations(source, "src/domain/paipan/leak.ts");
    expect(violation).toEqual(
      expect.objectContaining({ fromLayer: "domain", toLayer: "hooks" }),
    );
  });

  it("允许 domain 内相对引用停留在 domain 子树", () => {
    const source = 'import { paipan } from "../paipan/paipan";';
    expect(findDependencyViolations(source, "src/domain/paipan/mingpan.ts")).toEqual([]);
  });

  it("仅允许天文 facade import 私有寿星核心", () => {
    const source =
      'import { equationOfTimeDays } from "@/domain/time/shouxing/solar-core";';
    expect(
      findDependencyViolations(source, "src/domain/time/astronomy.ts"),
    ).toEqual([]);
    expect(
      findDependencyViolations(source, "src/domain/paipan/paipan.ts"),
    ).toEqual([
      expect.objectContaining({ toLayer: "private-shouxing-core" }),
    ]);
  });

  it("拒绝生产层 import 测试 oracle", () => {
    const source =
      'import { fixture } from "../../../test/oracles/independent-astronomy";';
    expect(
      findDependencyViolations(source, "src/domain/time/astronomy.ts"),
    ).toEqual([
      expect.objectContaining({ toLayer: "test-oracle" }),
    ]);
  });

  it("拒绝生产层 import 任意测试 fixture", () => {
    const source =
      'import { fixture } from "../../../test/fixtures/astronomy";';
    expect(
      findDependencyViolations(source, "src/domain/time/astronomy.ts"),
    ).toEqual([
      expect.objectContaining({ toLayer: "test-artifact" }),
    ]);
  });

  it("只允许 paipan 与 mingpan 入口定位真太阳时 Jie", () => {
    const source =
      'import { locateJie } from "@/domain/time/jie-chronology";';
    expect(
      findDependencyViolations(source, "src/domain/paipan/paipan.ts"),
    ).toEqual([]);
    expect(
      findDependencyViolations(source, "src/domain/paipan/mingpan.ts"),
    ).toEqual([]);
    expect(
      findDependencyViolations(source, "src/domain/paipan/dayun.ts"),
    ).toEqual([
      expect.objectContaining({ toLayer: "true-solar-conversion-boundary" }),
    ]);
  });

  it("拒绝天文 facade 重新暴露旧北京时间 Jie seam", () => {
    const source = `
      import type { BeijingDateTime } from "@/domain/time/date-time";
      export function jieMoment(): BeijingDateTime {
        throw new Error("legacy");
      }
    `;
    expect(
      findDependencyViolations(source, "src/domain/time/astronomy.ts"),
    ).toEqual([
      expect.objectContaining({
        specifier: "jieMoment",
        toLayer: "unauthorized-astronomy-facade-export",
      }),
    ]);
  });

  it("拒绝天文 facade 改名重新暴露北京时间 Jie seam", () => {
    const source = `
      import type { BeijingDateTime } from "@/domain/time/date-time";
      export function beijingJieMoment(): BeijingDateTime {
        throw new Error("legacy");
      }
    `;
    expect(
      findDependencyViolations(source, "src/domain/time/astronomy.ts"),
    ).toEqual([
      expect.objectContaining({
        specifier: "beijingJieMoment",
        toLayer: "unauthorized-astronomy-facade-export",
      }),
    ]);
  });

  it("允许 utils -> domain（展示适配消费纯核）", () => {
    const source = 'import { characterWuxing } from "@/domain/ganzhi/wuxing";';
    expect(findDependencyViolations(source, "src/utils/wuxing.ts")).toEqual([]);
  });

  it("允许 domain -> data（出生地消费生成数据）", () => {
    const source = 'import { CITIES } from "@/data/cities.generated";';
    expect(findDependencyViolations(source, "src/domain/birth/birthplace.ts")).toEqual([]);
  });

  it("拒绝 utils 指向上游消费层 components", () => {
    const source = 'import { Button } from "@/components/ui/button";';
    const [violation] = findDependencyViolations(source, "src/utils/wuxing.ts");
    expect(violation).toEqual(
      expect.objectContaining({ fromLayer: "utils", toLayer: "components" }),
    );
  });

  it("允许 pages -> components / domain / utils，允许 app -> pages", () => {
    expect(
      findDependencyViolations(
        'import { BirthDataForm } from "@/components/paipan-form/BirthDataForm";',
        "src/pages/paipan/PaipanPage.tsx",
      ),
    ).toEqual([]);
    expect(
      findDependencyViolations(
        'import { PaipanPage } from "@/pages/paipan/PaipanPage";',
        "src/app/App.tsx",
      ),
    ).toEqual([]);
  });

  it("允许 app -> books，并拒绝共享典籍模块反向依赖 pages", () => {
    expect(
      findDependencyViolations(
        'import BooksRoutes from "@/books/shared/BooksRoutes";',
        "src/app/App.tsx",
      ),
    ).toEqual([]);
    expect(
      findDependencyViolations(
        'import { PaipanPage } from "@/pages/paipan/PaipanPage";',
        "src/books/shared/leak.ts",
      ),
    ).toEqual([
      expect.objectContaining({ fromLayer: "books", toLayer: "pages" }),
    ]);
  });

  it("formatViolation 报告文件、行列、方向与允许集", () => {
    const source = 'import { Button } from "@/components/ui/button";';
    const [violation] = findDependencyViolations(source, "src/domain/paipan/leak.ts");
    expect(formatViolation("src/domain/paipan/leak.ts", violation!)).toBe(
      "src/domain/paipan/leak.ts:1:24 forbidden dependency direction domain -> components via @/components/ui/button; allowed targets for domain: domain, data",
    );
  });

  it("对整仓扫描抛出越层清单（exit 非 0 语义）", () => {
    const root = mkdtempSync(path.join(tmpdir(), "dep-guard-"));
    try {
      mkdirSync(path.join(root, "src", "domain", "paipan"), { recursive: true });
      mkdirSync(path.join(root, "src", "components", "ui"), { recursive: true });
      writeFileSync(
        path.join(root, "src", "components", "ui", "button.tsx"),
        "export const Button = {};\n",
      );
      writeFileSync(
        path.join(root, "src", "domain", "paipan", "leak.ts"),
        'import { Button } from "@/components/ui/button";\n',
      );
      expect(() => checkDependencyDirection(root)).toThrow(/domain -> components/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
