// 北京时间（UTC+8）边缘工具
// "今年"只活在 Web API 边缘（ADR-0003）：按北京时间读机器时钟算出今年公历年，
// 用于标记大运关联流年。排盘核心不读时钟。
// 独立成模块以便定点测试跨时区/跨年归年逻辑。

/** 北京时间 UTC+8 偏移（毫秒）。用于在 Web API 边缘按中国历法判断"今年"。 */
export const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 按北京时间（UTC+8）读取机器时钟，返回当前公历年月。 */
export function getBeijingYearMonth(): { year: number; month: number } {
  const { year, month } = getBeijingCurrentMoment();
  return { year, month };
}

/** 在调用瞬间读取完整当前时刻，并附带对应的北京时间公历年月。 */
export function getBeijingCurrentMoment(): { year: number; month: number; utcMs: number } {
  const utcMs = Date.now();
  const beijingNow = new Date(utcMs + BEIJING_OFFSET_MS);
  const year = beijingNow.getUTCFullYear();
  const month = beijingNow.getUTCMonth() + 1;
  return { year, month, utcMs };
}
