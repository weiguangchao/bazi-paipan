import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const manifestPath = path.resolve("dist/.vite/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const entry = manifest["index.html"];

if (!entry?.file) {
  throw new Error(`未在 ${manifestPath} 找到 index.html 入口`);
}

const entryPath = path.resolve("dist", entry.file);
const { size } = await stat(entryPath);
const viteWarningThresholdBytes = 500_000;
const previousMainChunkBytes = 540_420;

if (size >= previousMainChunkBytes) {
  throw new Error(
    `主 JS chunk ${(size / 1000).toFixed(2)} kB 未小于重构前 540.42 kB`,
  );
}

if (size > viteWarningThresholdBytes) {
  throw new Error(
    `主 JS chunk ${(size / 1000).toFixed(2)} kB 仍超过 Vite 500 kB 警告阈值`,
  );
}

const assetsPath = path.resolve("dist/assets");
const javascriptAssets = (await readdir(assetsPath)).filter((file) => file.endsWith(".js"));
for (const file of javascriptAssets) {
  const assetSize = (await stat(path.join(assetsPath, file))).size;
  if (assetSize > viteWarningThresholdBytes) {
    throw new Error(
      `${file} ${(assetSize / 1000).toFixed(2)} kB 超过 Vite 500 kB 警告阈值`,
    );
  }
}

console.log(`主 JS chunk ${(size / 1000).toFixed(2)} kB，通过体积门禁`);
