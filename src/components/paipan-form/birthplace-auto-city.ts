// 自动携带唯一城市：省恰好有一个城市时返回该城市，否则返回空串。
// 阈值 = 严格等于 1（grilling 决议，非直辖市特判）：北京市/天津市/上海市各只有"市辖区"
// -> 触发；重庆市有两个城市 -> 不触发。城市名原样取自数据 key，不做展示层替换。
// 纯函数（仅依赖 CITIES 数据），供 BirthplaceSelect 在选省后调用，也便于单测。
import { CITIES } from "@/data/cities.generated";

/**
 * 返回省所对应的自动携带城市：省恰好有一个城市时返回该城市，否则返回空串。
 * 空省与未知省均返回空串，不抛错。
 */
export function resolveSingleCity(province: string): string {
  if (!province) return "";
  const cities = Object.keys(CITIES[province] ?? {});
  // 严格等于 1：Object.keys 已确保唯一项存在，显式取 [0] 兜底空串以满足类型。
  const [only] = cities;
  return cities.length === 1 && only ? only : "";
}
