import { describe, it, expect, expectTypeOf } from "vitest";
import {
  resolveInitialBirthDate,
  DEFAULT_BIRTH_DATE,
} from "@/pages/paipan/use-paipan-form";
import { getBirthDateLimit } from "@/domain/birth/birth-date";

// 表单层初始出生日期解析：URL 合法 date 优先，否则预填默认 2000-01-01。
// 默认值是表单关注点（CONTEXT.md「出生资料」定义的是输入本身），领域层对空 date 仍报错。
describe("resolveInitialBirthDate", () => {
  it("无 date 入参（首次加载）-> 预填默认 2000-01-01", () => {
    const d = resolveInitialBirthDate(undefined);
    expect(d.getFullYear()).toBe(2000);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it("URL 合法 date -> URL 优先，不取默认", () => {
    const d = resolveInitialBirthDate("1985-03-15");
    expect(d.getFullYear()).toBe(1985);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(15);
  });

  it("非 YYYY-MM-DD 串 -> 落回默认 2000-01-01，不 NaN", () => {
    const d = resolveInitialBirthDate("not-a-date");
    expect(Number.isNaN(d.getTime())).toBe(false);
    expect(d.getFullYear()).toBe(2000);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it("形如 YYYY-MM-DD 但日历越界 -> 落回默认 2000-01-01", () => {
    const d = resolveInitialBirthDate("2026-13-40");
    expect(Number.isNaN(d.getTime())).toBe(false);
    expect(d.getFullYear()).toBe(2000);
    expect(DEFAULT_BIRTH_DATE).toBe("2000-01-01");
  });
});

describe("出生日期选择范围", () => {
  it("固定上限计算不接收当前时刻", () => {
    expectTypeOf(getBirthDateLimit).parameters.toEqualTypeOf<[]>();
  });

  it("固定上限为 2099-12-31", () => {
    expect(getBirthDateLimit()).toEqual({
      year: 2099,
      month: 12,
      day: 31,
    });
  });
});
