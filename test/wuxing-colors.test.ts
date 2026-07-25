// 五行展示守卫：配色对比度（WCAG）与 emoji 形状。
// 仅守 src/utils/wuxing.ts 这一展示模块的公共契约（颜色 class + emoji 表）。
// 独立真值：Tailwind v4 默认色板 hex 字面量，不从代码推导（避免同义重算）。
import { describe, it, expect } from "vitest";
import { wuxingTextColors, wuxingEmoji, type WuxingClass } from "@/utils/wuxing";

// Tailwind v4 默认色板 hex（独立真值，勿从 class 反推）。
const classHex: Record<string, string> = {
  "text-emerald-700": "#047857",
  "text-rose-700": "#be123c",
  "text-yellow-700": "#a16207",
  "text-slate-600": "#475569",
  "text-blue-600": "#2563eb",
};

// 亮底奶白背景 src/index.css --background oklch(0.968 0.005 80) 的近似 sRGB。
const creamBg = "#faf8f3";

function srgbLinear(c: number) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function relativeLuminance(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * srgbLinear(r!) + 0.7152 * srgbLinear(g!) + 0.0722 * srgbLinear(b!);
}
function contrast(fgHex: string, bgHex: string) {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const expected: Record<WuxingClass, { hex: string; emoji: string }> = {
  wood: { hex: "#047857", emoji: "🪵" },
  fire: { hex: "#be123c", emoji: "🔥" },
  earth: { hex: "#a16207", emoji: "⛰️" },
  metal: { hex: "#475569", emoji: "🪙" },
  water: { hex: "#2563eb", emoji: "💧" },
};

describe("wuxingTextColors - 五色对比度达 WCAG AA 正文(>=4.5:1)", () => {
  for (const w of Object.keys(expected) as WuxingClass[]) {
    const cls = wuxingTextColors[w];
    it(`${w} (${cls} / ${expected[w].hex}) 对奶白底对比 >= 4.5`, () => {
      expect(classHex[cls]).toBe(expected[w].hex);
      expect(contrast(expected[w].hex, creamBg)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("wuxingEmoji - 五行 emoji 表形状(木🪵 火🔥 土⛰️ 金🪙 水💧)", () => {
  it("五项齐全且取值正确", () => {
    expect(wuxingEmoji.wood).toBe("🪵");
    expect(wuxingEmoji.fire).toBe("🔥");
    expect(wuxingEmoji.earth).toBe("⛰️");
    expect(wuxingEmoji.metal).toBe("🪙");
    expect(wuxingEmoji.water).toBe("💧");
  });
});
