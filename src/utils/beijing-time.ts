// 北京时间（UTC+8）边缘工具
// 浏览器边缘在用户点击排盘时读取完整当前时刻（ADR-0003），用于标记当前大运、
// 今年与当前流月。领域函数不直接读取时钟。
// 独立成模块以便定点测试跨时区/跨年归年逻辑。

import {
  beijingDateTime,
  type BeijingDateTime,
} from "@/domain/time/date-time";

const BEIJING_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1000;

/** 在调用瞬间读取一次机器时钟，并构造完整的北京时间。 */
export function getCurrentBeijingDateTime(): BeijingDateTime {
  const beijingNow = new Date(Date.now() + BEIJING_OFFSET_MILLISECONDS);
  return beijingDateTime({
    year: beijingNow.getUTCFullYear(),
    month: beijingNow.getUTCMonth() + 1,
    day: beijingNow.getUTCDate(),
    hour: beijingNow.getUTCHours(),
    minute: beijingNow.getUTCMinutes(),
    second: beijingNow.getUTCSeconds(),
  });
}
