import catalogData from "./catalog.json";
import chapterVolumeMap from "./chapter-volume-map.json";
import { createBookDefinition } from "@/books/shared/create-book-definition";
import type { BookCatalog } from "@/books/shared/navigation";

const volumeImports = {
  v1: () => import("./volumes/v1"),
  v2: () => import("./volumes/v2"),
  v3: () => import("./volumes/v3"),
  v4: () => import("./volumes/v4"),
  v5: () => import("./volumes/v5"),
};

export default createBookDefinition(
  catalogData as BookCatalog,
  chapterVolumeMap,
  volumeImports,
);
