import type { Jie } from "@/domain/time/astronomy";

/**
 * NASA/JPL Horizons API，2026-07-28 获取。
 * Target=Sun (10), center=Earth geocenter (500@399), observer quantity #31,
 * airless apparent ecliptic-of-date longitude；以相邻一分钟结果线性求根。
 */
export const jplJieFixtures: ReadonlyArray<{
  year: number;
  jie: Jie;
  utcIso: string;
}> = [
  { year: 1801, jie: "立春", utcIso: "1801-02-04T05:28:24.722Z" },
  { year: 1825, jie: "惊蛰", utcIso: "1825-03-05T19:58:27.900Z" },
  { year: 1850, jie: "清明", utcIso: "1850-04-05T03:37:16.703Z" },
  { year: 1875, jie: "立夏", utcIso: "1875-05-05T22:57:05.115Z" },
  { year: 1900, jie: "芒种", utcIso: "1900-06-06T04:39:01.193Z" },
  { year: 1925, jie: "小暑", utcIso: "1925-07-07T16:24:58.224Z" },
  { year: 1950, jie: "立秋", utcIso: "1950-08-08T02:55:13.617Z" },
  { year: 1975, jie: "白露", utcIso: "1975-09-08T06:33:17.924Z" },
  { year: 2000, jie: "寒露", utcIso: "2000-10-07T23:38:13.006Z" },
  { year: 2024, jie: "立春", utcIso: "2024-02-04T08:27:08.696Z" },
  { year: 2025, jie: "立冬", utcIso: "2025-11-07T04:04:03.867Z" },
  { year: 2050, jie: "大雪", utcIso: "2050-12-06T22:41:57.940Z" },
  { year: 2075, jie: "小寒", utcIso: "2075-01-05T05:58:45.466Z" },
  { year: 2099, jie: "大雪", utcIso: "2099-12-06T20:05:08.154Z" },
];

/**
 * 同一组 Horizons observer 请求，center=coord@399、经纬度 0°/0°，
 * quantity #34 Local Apparent Solar Time。expectedSeconds 为视太阳时减平太阳时。
 */
export const jplEquationOfTimeFixtures = [
  {
    universal: [1801, 2, 4, 5, 28, 24.722],
    expectedSeconds: -857.946,
  },
  {
    universal: [1900, 6, 6, 4, 39, 1.193],
    expectedSeconds: 100.5856,
  },
  {
    universal: [2000, 10, 7, 23, 38, 13.006],
    expectedSeconds: 745.1239,
  },
  {
    universal: [2024, 2, 4, 8, 27, 8.696],
    expectedSeconds: -829.3499,
  },
  {
    universal: [2099, 12, 6, 20, 5, 8.154],
    expectedSeconds: 532.3573,
  },
] as const;

/**
 * 香港天文台《2014 年二十四节气的日期及时间资料》，香港时间，分钟精度。
 * https://www.hko.gov.hk/en/gts/astron2014/Solar_Term_2014.htm
 */
export const hkoJieFixtures: ReadonlyArray<{
  jie: Jie;
  month: number;
  day: number;
  hour: number;
  minute: number;
}> = [
  { jie: "小寒", month: 1, day: 5, hour: 18, minute: 24 },
  { jie: "立春", month: 2, day: 4, hour: 6, minute: 3 },
  { jie: "惊蛰", month: 3, day: 6, hour: 0, minute: 2 },
  { jie: "清明", month: 4, day: 5, hour: 4, minute: 47 },
  { jie: "立夏", month: 5, day: 5, hour: 21, minute: 59 },
  { jie: "芒种", month: 6, day: 6, hour: 2, minute: 3 },
  { jie: "小暑", month: 7, day: 7, hour: 12, minute: 15 },
  { jie: "立秋", month: 8, day: 7, hour: 22, minute: 2 },
  { jie: "白露", month: 9, day: 8, hour: 1, minute: 1 },
  { jie: "寒露", month: 10, day: 8, hour: 16, minute: 47 },
  { jie: "立冬", month: 11, day: 7, hour: 20, minute: 7 },
  { jie: "大雪", month: 12, day: 7, hour: 13, minute: 4 },
];
