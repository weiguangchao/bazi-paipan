import { describe, it, expect } from "vitest";
import {
  tianganWuxing,
  dizhiWuxing,
  characterWuxing,
  type Wuxing,
} from "../src/wuxing.js";
import { tiangan, dizhi } from "../src/ganzhi.js";

// 五行查询：核心唯一定义五行归属。
// 天干：甲乙木、丙丁火、戊己土、庚辛金、壬癸水。
// 地支：辰戌丑未土、亥子水、寅卯木、巳午火、申酉金。

const expectedTianganWuxing: Wuxing[] = [
  "木", "木", "火", "火", "土", "土", "金", "金", "水", "水",
];

describe("天干五行查询 - 10 天干全量覆盖", () => {
  for (let i = 0; i < tiangan.length; i++) {
    const character = tiangan[i]!;
    it(`${character} -> ${expectedTianganWuxing[i]}`, () => {
      expect(tianganWuxing(character)).toBe(expectedTianganWuxing[i]);
    });
  }
});

const expectedDizhiWuxing: Wuxing[] = [
  "水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水",
];

describe("地支五行查询 - 12 地支全量覆盖", () => {
  for (let i = 0; i < dizhi.length; i++) {
    const character = dizhi[i]!;
    it(`${character} -> ${expectedDizhiWuxing[i]}`, () => {
      expect(dizhiWuxing(character)).toBe(expectedDizhiWuxing[i]);
    });
  }
});

describe("characterWuxing - 天干与地支共用入口", () => {
  it("天干走 tianganWuxing 路径", () => {
    expect(characterWuxing("甲")).toBe("木");
    expect(characterWuxing("癸")).toBe("水");
  });

  it("地支走 dizhiWuxing 路径", () => {
    expect(characterWuxing("子")).toBe("水");
    expect(characterWuxing("未")).toBe("土");
  });
});

describe("五行查询 - 非法字符显式抛错", () => {
  it("天干查询非法字符抛错", () => {
    expect(() => tianganWuxing("X" as never)).toThrow();
  });

  it("地支查询非法字符抛错", () => {
    expect(() => dizhiWuxing("X" as never)).toThrow();
  });

  it("characterWuxing 对既非天干又非地支的字符抛错，不静默兜底", () => {
    expect(() => characterWuxing("X" as never)).toThrow(/非法天干地支/);
  });
});