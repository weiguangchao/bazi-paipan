import { performance } from "node:perf_hooks";
import { mingpan } from "../src/domain/paipan/mingpan";
import { beijingDateTime } from "../src/domain/time/date-time";

const input = {
  year: 1990,
  month: 5,
  day: 15,
  hour: 12,
  minute: 0,
  gender: "男" as const,
  birthplace: { province: "四川省", city: "成都市" },
};
const currentTime = beijingDateTime({
  year: 2026, month: 7, day: 28, hour: 12, minute: 0, second: 0,
});

const firstStartedAt = performance.now();
mingpan(input, currentTime);
const firstDuration = performance.now() - firstStartedAt;

const durations: number[] = [];
for (let index = 0; index < 50; index += 1) {
  const startedAt = performance.now();
  mingpan(input, currentTime);
  durations.push(performance.now() - startedAt);
}
durations.sort((left, right) => left - right);
const p95 = durations[Math.ceil(durations.length * 0.95) - 1]!;

if (firstDuration > 100) {
  throw new Error(`首次完整命盘 ${firstDuration.toFixed(2)} ms，超过 100 ms`);
}
if (p95 > 50) {
  throw new Error(`连续 50 次完整命盘 p95 ${p95.toFixed(2)} ms，超过 50 ms`);
}

console.log(
  `天文生产路径性能通过：首次 ${firstDuration.toFixed(2)} ms，50 次 p95 ${p95.toFixed(2)} ms`,
);
