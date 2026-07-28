// 北京时间（UTC+8）边缘工具
// 浏览器边缘在用户点击排盘时读取完整当前时刻（ADR-0003），用于标记当前大运、
// 今年与当前流月。领域函数不直接读取时钟。
// 独立成模块以便定点测试跨时区/跨年归年逻辑。

import {
  beijingDateTime,
  type BeijingDateTime,
} from "@/domain/time/date-time";

const BEIJING_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1000;

/** 按北京时间（UTC+8）读取机器时钟，返回当前公历年月。 */
export function getBeijingYearMonth(): { year: number; month: number } {
  const { year, month } = getBeijingCurrentMoment();
  return { year, month };
}

/** 在调用瞬间读取完整当前时刻，并附带对应的北京时间公历年月。 */
export function getBeijingCurrentMoment(): {
  year: number;
  month: number;
  dateTime: BeijingDateTime;
} {
  const beijingNow = new Date(Date.now() + BEIJING_OFFSET_MILLISECONDS);
  const year = beijingNow.getUTCFullYear();
  const month = beijingNow.getUTCMonth() + 1;
  return {
    year,
    month,
    dateTime: beijingDateTime({
      year,
      month,
      day: beijingNow.getUTCDate(),
      hour: beijingNow.getUTCHours(),
      minute: beijingNow.getUTCMinutes(),
      second: beijingNow.getUTCSeconds(),
    }),
  };
}
