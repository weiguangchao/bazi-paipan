import { chapterContentFromModules } from "@/books/shared/from-modules";
export default chapterContentFromModules(import.meta.glob("../../../../content/books/wudenghuiyuan/chapters/v9/*.md", { eager: true, query: "?raw", import: "default" }));
