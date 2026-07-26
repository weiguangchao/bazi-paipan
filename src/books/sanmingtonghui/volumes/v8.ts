import { chapterContentFromModules } from "@/books/shared/from-modules";
export default chapterContentFromModules(import.meta.glob("../../../../content/books/sanmingtonghui/chapters/v8/*.md", { eager: true, query: "?raw", import: "default" }));
