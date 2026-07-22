#!/usr/bin/env node
// 生成 public/ 下的静态数据资源：省份索引 + 分省城市资源。
// 浏览器先加载省份索引，选择省份后再按需加载对应省份的城市列表。
// 服务端只服务这些静态文件，不提供城市查询 API。

"use strict";

const fs = require("node:fs");
const path = require("node:path");

// 从 src/data/cities.generated.ts 读取 CITIES 对象
const generatedPath = path.join(__dirname, "..", "src", "data", "cities.generated.ts");
const src = fs.readFileSync(generatedPath, "utf8");

// 提取 export const CITIES = ... 后的 JSON
const match = src.match(/export const CITIES[^=]*=\s*(\{[\s\S]*?\});/);
if (!match) {
  console.error("无法从 cities.generated.ts 提取 CITIES");
  process.exit(1);
}
const cities = JSON.parse(match[1]);

const publicCitiesDir = path.join(__dirname, "..", "public", "cities");
fs.mkdirSync(publicCitiesDir, { recursive: true });

// 省份索引：省份名列表
const provinces = Object.keys(cities);
fs.writeFileSync(
  path.join(publicCitiesDir, "provinces.json"),
  JSON.stringify(provinces),
);

// 分省城市资源：每省一个文件，只含城市名列表（不含经度，浏览器绝不提交经度）
for (const province of provinces) {
  const cityNames = Object.keys(cities[province]);
  const safeName = encodeURIComponent(province);
  fs.writeFileSync(
    path.join(publicCitiesDir, safeName + ".json"),
    JSON.stringify(cityNames),
  );
}

console.error("已生成 " + provinces.length + " 个省份索引与 " + provinces.length + " 个分省城市资源到 public/cities/");
