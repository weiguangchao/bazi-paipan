import { describe, expect, it } from "vitest";
import { JIE_NAMES, jieMoment } from "@/domain/time/astronomy";
import {
  equationOfTimeDays,
  julianDayFromFields,
} from "@/domain/time/shouxing/solar-core";
import {
  referenceEquationOfTimeSeconds,
  referenceJieMoment,
} from "../scripts/shouxing-reference-runner.mjs";

const J2000 = 2451545;
const BEIJING_OFFSET_DAYS = 8 / 24;

describe("固定寿星 JavaScript reference 全量差分", () => {
  it("1801–2099 × 12 个 Jie 的整秒出口 3588/3588 完全相等", () => {
    let checked = 0;
    for (let year = 1801; year <= 2099; year += 1) {
      for (const jie of JIE_NAMES) {
        expect(jieMoment(year, jie)).toMatchObject(referenceJieMoment(year, jie));
        checked += 1;
      }
    }
    expect(checked).toBe(3588);
  });

  it("每年十二个代表日期的高精度均时差误差不超过 0.01 秒", () => {
    let maximumErrorSeconds = 0;
    for (let year = 1801; year <= 2099; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const fields = {
          year, month, day: 15, hour: 12, minute: 0, second: 0,
        };
        const localDays =
          julianDayFromFields(year, month, 15, 12, 0, 0) - J2000;
        const actualSeconds =
          equationOfTimeDays(localDays - BEIJING_OFFSET_DAYS) * 86400;
        const expectedSeconds = referenceEquationOfTimeSeconds(fields);
        maximumErrorSeconds = Math.max(
          maximumErrorSeconds,
          Math.abs(actualSeconds - expectedSeconds),
        );
      }
    }
    expect(maximumErrorSeconds).toBeLessThanOrEqual(0.01);
  });
});
