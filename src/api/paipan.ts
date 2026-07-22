// 排盘 API 适配层：把网页输入适配到既有纯领域函数，组合浏览器导向输出。
// 唯一业务 API POST /api/paipan 的处理逻辑。不改变领域语义，只做校验 + 组装。
// 词汇遵循 CONTEXT.md。错误信封与成功信封由本模块产出。

import { 排盘, type 排盘Input } from "../paipan.js";
import { liunian } from "../liunian.js";
import { shishen, cangganTable } from "../shishen.js";
import { findLongitude, type Birthplace } from "../birthplace.js";
import { getBeijingYear } from "../beijing-time.js";
import type { Gender } from "../dayun.js";

/** API 输入：出生资料（网页提交）。省市可同时为空或同时给出。 */
export interface PaipanInput {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  gender: string;
  province?: string;
  city?: string;
}

/** 字段级错误：invalid 字段名集合 + 全局中文消息 + 错误码。 */
export interface PaipanError {
  code: string;
  message: string;
  fields: Record<string, string>;
}

/** 藏干及其相对日主的十神。两者同属 API 计算结果，前端不推导命理语义。 */
export interface CangGanOut {
  gan: string;
  shiShen: string;
}

/** 单柱 API 结构。 */
export interface PillarOut {
  ganZhi: string;
  shiShen: string; // 天干十神；日柱天干位为 "日主"
  cangGan: CangGanOut[]; // 藏干及其副星（与藏干顺序一致）
}

export interface SiZhuOut {
  year: PillarOut;
  month: PillarOut;
  day: PillarOut;
  hour: PillarOut;
}

export interface TipOut {
  code: string;
  message: string;
}

export interface DayunZhuOut {
  ganZhi: string;
  shiShen: string;
  cangGan: string[];
  qiYun: { ageYears: number; ageMonths: number };
  startYear: number;
  startMonth: number;
}

export interface DayunOut {
  direction: "顺" | "逆";
  qiYun: { ageYears: number; ageMonths: number };
  zhu: DayunZhuOut[];
}

export interface LiunianItemOut {
  year: number;
  ganZhi: string;
  shiShen: string;
  cangGan: string[];
}

export interface PaipanData {
  input: { date: string; time: string; gender: string; province: string; city: string };
  siZhu: SiZhuOut;
  tips: TipOut[];
  dayun: DayunOut;
  liunian: LiunianItemOut[];
}

export const DEFAULT_PROVINCE = "北京市";
export const DEFAULT_CITY = "市辖区";

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

function pillarToOut(ganZhi: string, dayMasterTiangan: string, isDayPillar: boolean): PillarOut {
  const { tianganShishen, cangganShishen } = shishen(dayMasterTiangan, ganZhi);
  const zhi = ganZhi.charAt(1);
  const canggan = cangganTable[zhi]!;
  return {
    ganZhi,
    shiShen: isDayPillar ? "日主" : tianganShishen,
    cangGan: canggan.map((gan, i) => ({ gan, shiShen: cangganShishen[i]! })),
  };
}

function dayunZhuToOut(
  ganZhi: string,
  dayMasterTiangan: string,
  qiYun: { ageYears: number; ageMonths: number },
  startYearMonth: { year: number; month: number },
): DayunZhuOut {
  const { tianganShishen, cangganShishen } = shishen(dayMasterTiangan, ganZhi);
  const zhi = ganZhi.charAt(1);
  const canggan = cangganTable[zhi]!;
  return {
    ganZhi,
    shiShen: tianganShishen,
    cangGan: canggan.map((g, i) => g + cangganShishen[i]),
    qiYun: { ageYears: qiYun.ageYears, ageMonths: qiYun.ageMonths },
    startYear: startYearMonth.year,
    startMonth: startYearMonth.month,
  };
}

function isValidGregorianDate(year: number, month: number, day: number): boolean {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function isAfterLimit(y: number, m: number, d: number, limitYear: number, limitMonth: number, limitDay: number): boolean {
  if (y < limitYear) return false;
  if (y > limitYear) return true;
  if (m < limitMonth) return false;
  if (m > limitMonth) return true;
  return d > limitDay;
}

export function computePaipan(
  input: PaipanInput,
): { ok: true; data: PaipanData } | { ok: false; error: PaipanError } {
  const fields: Record<string, string> = {};

  if (input.gender !== "男" && input.gender !== "女") {
    fields.gender = "性别须为 男 或 女";
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  let year = 0, month = 0, day = 0;
  let dateValid = false;
  if (dateMatch) {
    year = parseInt(dateMatch[1]!, 10);
    month = parseInt(dateMatch[2]!, 10);
    day = parseInt(dateMatch[3]!, 10);
    dateValid = isValidGregorianDate(year, month, day);
  }
  if (!dateMatch || !dateValid) {
    fields.date = "出生日期须为有效公历 YYYY-MM-DD";
  }

  const timeMatch = /^(\d{2}):(\d{2})$/.exec(input.time);
  let hour = 0, minute = 0;
  let timeValid = false;
  if (timeMatch) {
    hour = parseInt(timeMatch[1]!, 10);
    minute = parseInt(timeMatch[2]!, 10);
    timeValid = hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }
  if (!timeMatch || !timeValid) {
    fields.time = "出生时间须为有效 HH:mm";
  }

  if (dateValid && timeValid) {
    const now = new Date(Date.now() + BEIJING_OFFSET_MS);
    const beijingYear = now.getUTCFullYear();
    const beijingMonth = now.getUTCMonth() + 1;
    const beijingDay = now.getUTCDate();
    const limitYear = beijingYear + 100;
    if (isAfterLimit(year, month, day, limitYear, beijingMonth, beijingDay)) {
      fields.date = "出生日期不得晚于服务当前北京日期后 100 个日历年（" + limitYear + "-" + String(beijingMonth).padStart(2, "0") + "-" + String(beijingDay).padStart(2, "0") + "）";
    }
  }

  const hasProv = input.province !== undefined && input.province !== "";
  const hasCity = input.city !== undefined && input.city !== "";
  if (hasProv !== hasCity) {
    fields.province = "省份与城市须同时给出或同时清空";
    fields.city = "省份与城市须同时给出或同时清空";
  } else if (hasProv && hasCity) {
    const lookup = findLongitude({ province: input.province!, city: input.city! });
    if (!lookup.found) {
      if (lookup.reason === "未知省份") {
        fields.province = "未知省份：" + input.province;
      } else {
        fields.city = "省份" + input.province + "下无城市" + input.city;
      }
    }
  }

  if (Object.keys(fields).length > 0) {
    return {
      ok: false,
      error: {
        code: fields.province || fields.city ? "UNKNOWN_BIRTHPLACE" : "INVALID_INPUT",
        message: Object.values(fields)[0]!,
        fields,
      },
    };
  }

  const birthplace: Birthplace | undefined =
    hasProv && hasCity ? { province: input.province!, city: input.city! } : undefined;
  const domainInput: 排盘Input = { year, month, day, hour, minute, birthplace, gender: input.gender as Gender };

  const result = 排盘(domainInput);
  const dayMasterTiangan = result.日柱.charAt(0);

  const siZhu: SiZhuOut = {
    year: pillarToOut(result.年柱, dayMasterTiangan, false),
    month: pillarToOut(result.月柱, dayMasterTiangan, false),
    day: pillarToOut(result.日柱, dayMasterTiangan, true),
    hour: pillarToOut(result.时柱, dayMasterTiangan, false),
  };

  const tips: TipOut[] = [];
  if (result.近子正) {
    tips.push({ code: "NEAR_ZI_ZHENG", message: "出生时刻近子正（00:00），已按早晚子时归属日柱与时柱；若实际时刻略有出入，排盘结果可能不同。" });
  }
  if (!result.经度修正) {
    tips.push({ code: "NO_LONGITUDE_CORRECTION", message: "未做经度修正，真太阳时可能偏移。给出出生省市可按出生地经度修正为真太阳时。" });
  } else {
    tips.push({ code: "TRUE_SOLAR_TIME", message: "已按出生地经度修正与均时差合成为真太阳时排盘。" });
  }

  const dayun = result.dayun!;
  const dayunOut: DayunOut = {
    direction: dayun.direction,
    qiYun: { ageYears: dayun.Qiyunsui.ageYears, ageMonths: dayun.Qiyunsui.ageMonths },
    zhu: dayun.zhu.map((p) => dayunZhuToOut(p.ganzhi, dayMasterTiangan, p.Qiyunsui, p.startYearMonth)),
  };

  const currentYear = getBeijingYear();
  const liunianResult = liunian(currentYear);
  const liunianItems: LiunianItemOut[] = liunianResult.map((p) => {
    const { tianganShishen, cangganShishen } = shishen(dayMasterTiangan, p.ganzhi);
    const zhi = p.ganzhi.charAt(1);
    const canggan = cangganTable[zhi]!;
    return { year: p.year, ganZhi: p.ganzhi, shiShen: tianganShishen, cangGan: canggan.map((g, i) => g + cangganShishen[i]) };
  });

  return {
    ok: true,
    data: {
      input: { date: input.date, time: input.time, gender: input.gender, province: input.province ?? "", city: input.city ?? "" },
      siZhu, tips, dayun: dayunOut, liunian: liunianItems,
    },
  };
}
