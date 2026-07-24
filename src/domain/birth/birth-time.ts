/** HH:mm 时间格式正则。 */
export const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

/** 解析 HH:mm 为时分；非法或越界返回 null。 */
export function parseTime(value: string): { hour: number; minute: number } | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  const hour = parseInt(match[1]!, 10);
  const minute = parseInt(match[2]!, 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}
