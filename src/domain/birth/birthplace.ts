// 出生地经度查找：省 -> 地级市 -> 经度。
// 数据资产 src/data/cities.generated.ts（约 340 条），由 scripts/build-cities-data.cjs
// 从 modood/Administrative-divisions-of-China (WTFPL) + 88250/city-geo (MulanPSL-2.0) 生成。

import { CITIES } from "@/data/cities.generated";

/** 出生地：省 + 地级市（均使用全名，与数据源一致，如 "四川省"/"成都市"）。 */
export interface Birthplace {
  province: string;
  city: string;
}

/** 查找结果：找到给出经度；未找到给出原因码，便于 CLI 提示用户。 */
export type FindLongitudeResult =
  | { found: true; longitude: number }
  | { found: false; reason: "未知省份" | "未知城市" };

/**
 * 按省/地级市全名查经度。
 * 城市名需与数据源一致（带"市"/"州"/"地区"等后缀）；未匹配则按层级返回原因。
 */
export function findLongitude(birth: Birthplace): FindLongitudeResult {
  const prov = CITIES[birth.province];
  if (!prov) return { found: false, reason: "未知省份" };
  const lng = prov[birth.city];
  if (lng === undefined) return { found: false, reason: "未知城市" };
  return { found: true, longitude: lng };
}
