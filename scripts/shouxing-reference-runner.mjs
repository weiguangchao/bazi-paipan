import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "test", "oracles", "shouxing", "eph0.js");
const source = fs.readFileSync(sourcePath, "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(source, context, { filename: sourcePath });

const J2000 = context.J2000;
const TWO_PI = Math.PI * 2;
const BEIJING_OFFSET_DAYS = 8 / 24;

const jieDefinition = {
  "立春": [315, 2, 4],
  "惊蛰": [345, 3, 6],
  "清明": [15, 4, 5],
  "立夏": [45, 5, 6],
  "芒种": [75, 6, 6],
  "小暑": [105, 7, 7],
  "立秋": [135, 8, 8],
  "白露": [165, 9, 8],
  "寒露": [195, 10, 8],
  "立冬": [225, 11, 7],
  "大雪": [255, 12, 7],
  "小寒": [285, 1, 6],
};

function continuousSolarLongitude(year, jie) {
  const [longitudeDegrees, month, day] = jieDefinition[jie];
  const target = longitudeDegrees * Math.PI / 180;
  const approximateDays = context.JD.JD(year, month, day + 0.5) - J2000;
  const approximateLongitude = 4.8950632 + 628.3319653318 * approximateDays / 36525;
  return target + Math.round((approximateLongitude - target) / TWO_PI) * TWO_PI;
}

export function referenceJieMoment(year, jie) {
  const target = continuousSolarLongitude(year, jie);
  const dynamicalDays = context.XL.S_aLon_t(target) * 36525;
  const localDays =
    dynamicalDays - context.dt_T(dynamicalDays) + BEIJING_OFFSET_DAYS;
  const fields = context.JD.DD(localDays + J2000);
  const rounded = new Date(Date.UTC(
    fields.Y,
    fields.M - 1,
    fields.D,
    fields.h,
    fields.m,
    Math.round(fields.s),
  ));
  return {
    year: rounded.getUTCFullYear(),
    month: rounded.getUTCMonth() + 1,
    day: rounded.getUTCDate(),
    hour: rounded.getUTCHours(),
    minute: rounded.getUTCMinutes(),
    second: rounded.getUTCSeconds(),
  };
}

export function referenceEquationOfTimeSeconds(fields) {
  const localDays =
    context.JD.JD(
      fields.year,
      fields.month,
      fields.day
        + (fields.hour + (fields.minute + fields.second / 60) / 60) / 24,
    ) - J2000;
  const universalDays = localDays - BEIJING_OFFSET_DAYS;
  const dynamicalDays = universalDays + context.dt_T(universalDays);
  return context.pty_zty(dynamicalDays / 36525) * 86400;
}
