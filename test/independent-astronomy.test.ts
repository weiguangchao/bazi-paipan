import { describe, expect, it } from "vitest";
import { jieMoment } from "@/domain/time/astronomy";
import {
  dateTimeTimestamp,
} from "@/domain/time/date-time";
import {
  equationOfTimeDays,
  julianDayFromFields,
} from "@/domain/time/shouxing/solar-core";
import {
  hkoJieFixtures,
  jplEquationOfTimeFixtures,
  jplJieFixtures,
} from "./oracles/independent-astronomy";

const BEIJING_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1000;
const J2000 = 2451545;

describe("独立天文 oracle", () => {
  it("JPL 跨 1801–2099 的交节样本误差不超过 120 秒", () => {
    let maximumErrorSeconds = 0;
    for (const fixture of jplJieFixtures) {
      const actualUtc =
        dateTimeTimestamp(jieMoment(fixture.year, fixture.jie))
        - BEIJING_OFFSET_MILLISECONDS;
      const expectedUtc = Date.parse(fixture.utcIso);
      maximumErrorSeconds = Math.max(
        maximumErrorSeconds,
        Math.abs(actualUtc - expectedUtc) / 1000,
      );
    }
    expect(maximumErrorSeconds).toBeLessThanOrEqual(120);
  });

  it("JPL 跨 1801–2099 的均时差样本误差不超过 1 秒", () => {
    let maximumErrorSeconds = 0;
    for (const fixture of jplEquationOfTimeFixtures) {
      const [year, month, day, hour, minute, second] = fixture.universal;
      const universalDays =
        julianDayFromFields(year, month, day, hour, minute, second) - J2000;
      const actualSeconds = equationOfTimeDays(universalDays) * 86400;
      maximumErrorSeconds = Math.max(
        maximumErrorSeconds,
        Math.abs(actualSeconds - fixture.expectedSeconds),
      );
    }
    expect(maximumErrorSeconds).toBeLessThanOrEqual(1);
  });

  it("HKO 官方 2014 分钟表的十二个 Jie 误差不超过 60 秒", () => {
    let maximumErrorSeconds = 0;
    for (const fixture of hkoJieFixtures) {
      const actual = jieMoment(2014, fixture.jie);
      const expectedTimestamp = Date.UTC(
        2014,
        fixture.month - 1,
        fixture.day,
        fixture.hour,
        fixture.minute,
      );
      maximumErrorSeconds = Math.max(
        maximumErrorSeconds,
        Math.abs(dateTimeTimestamp(actual) - expectedTimestamp) / 1000,
      );
    }
    expect(maximumErrorSeconds).toBeLessThanOrEqual(60);
  });
});
