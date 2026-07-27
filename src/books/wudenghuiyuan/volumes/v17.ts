import { chapterContentFromModules } from "@/books/shared/from-modules";
export default chapterContentFromModules(import.meta.glob("../../../../content/books/wudenghuiyuan/chapters/v17/*.md", { eager: true, query: "?raw", import: "default" }));
