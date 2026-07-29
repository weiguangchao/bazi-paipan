// URL 参数序列化与恢复：出生资料字符串 ↔ URL 参数。
// 词汇遵循 CONTEXT.md（出生资料）。
import { parseBirthDate } from "@/domain/birth/birth-date";
import { parseTime } from "@/domain/birth/birth-time";
import type { BirthDataInput } from "@/domain/birth/birth-profile";

/**
 * 从 URL 参数恢复出生资料字符串默认值；无效参数静默忽略（返回 undefined）。
 * 不做出生地查找与日期上限校验——这些在排盘提交时由 parse 兜底。
 */
export function fromUrlParams(params: URLSearchParams): Partial<BirthDataInput> {
  const date = params.get("date");
  const time = params.get("time");
  const gender = params.get("gender");
  const province = params.get("province");
  const city = params.get("city");

  return {
    date: date && parseBirthDate(date) !== null ? date : undefined,
    time: time && parseTime(time) !== null ? time : undefined,
    gender: gender === "男" || gender === "女" ? gender : undefined,
    province: province || undefined,
    city: city || undefined,
  };
}

/**
 * 把 URL decoder 的可缺省字段收拢为 smart form 的可选完整草稿。
 * 空 URL 不提供初始草稿；partial URL 用空字符串表达未解码字段，由 form 内部应用默认值。
 */
export function initialInputFromUrlParams(
  params: URLSearchParams,
): BirthDataInput | undefined {
  const restored = fromUrlParams(params);
  if (!Object.values(restored).some((value) => value !== undefined)) {
    return undefined;
  }
  return {
    date: restored.date ?? "",
    time: restored.time ?? "",
    gender: restored.gender ?? "",
    province: restored.province ?? "",
    city: restored.city ?? "",
  };
}

/** 把出生资料字符串序列化为 URL 参数；省市同时给时才写入，格式保持向后兼容。 */
export function toUrlParams(input: BirthDataInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("date", input.date);
  params.set("time", input.time);
  params.set("gender", input.gender);
  if (input.province && input.city) {
    params.set("province", input.province);
    params.set("city", input.city);
  }
  return params;
}
