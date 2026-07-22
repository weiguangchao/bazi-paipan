export function parseBirthDate(value) {
  if (typeof value !== "string") return null;
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  var year = parseInt(match[1], 10);
  var month = parseInt(match[2], 10);
  var day = parseInt(match[3], 10);
  var parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return null;
  }
  return { year: year, month: month, day: day };
}

export function getBirthDateLimit(nowMs) {
  var now = new Date(nowMs + 8 * 60 * 60 * 1000);
  return {
    year: now.getUTCFullYear() + 100,
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
}

export function isAfterBirthDateLimit(birthDate, nowMs) {
  var limit = getBirthDateLimit(nowMs);
  if (birthDate.year !== limit.year) return birthDate.year > limit.year;
  if (birthDate.month !== limit.month) return birthDate.month > limit.month;
  return birthDate.day > limit.day;
}
