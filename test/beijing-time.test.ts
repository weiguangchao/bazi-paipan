import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentBeijingDateTime } from "@/utils/beijing-time";

describe("浏览器当前北京时间边缘", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("一次读取固定 UTC instant 并构造完整 BeijingDateTime", () => {
    const dateNowSpy = vi
      .spyOn(Date, "now")
      .mockReturnValue(Date.UTC(2024, 11, 31, 16, 34, 56));

    expect(getCurrentBeijingDateTime()).toEqual({
      year: 2025,
      month: 1,
      day: 1,
      hour: 0,
      minute: 34,
      second: 56,
    });
    expect(dateNowSpy).toHaveBeenCalledOnce();
  });
});
