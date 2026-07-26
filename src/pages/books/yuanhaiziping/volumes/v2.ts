import { chapterContentFromModules } from "./from-modules";

export default chapterContentFromModules(
  import.meta.glob("../../../../../content/books/yuanhaiziping/chapters/v2/*.md", {
    eager: true,
    query: "?raw",
    import: "default",
  }),
);
