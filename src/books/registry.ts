import { BookRegistry } from "./shared/book-definition";

export const bookRegistry = new BookRegistry([
  {
    bookId: "yuanhaiziping",
    title: "渊海子平",
    author: "（宋）徐大升",
    description: "从五行生克、干支源流到诸格命例，按原卷次查阅二百六十九篇正文。",
    volumeCount: 5,
    chapterCount: 269,
    loadDefinition: () => import("./yuanhaiziping/definition").then((module) => module.default),
  },
  {
    bookId: "sanmingtonghui",
    title: "三命通会",
    author: "（明）万民英",
    description: "汇集干支、神煞、格局与命例论述，依原卷次查阅十二卷三百六十六篇正文。",
    volumeCount: 12,
    chapterCount: 366,
    loadDefinition: () => import("./sanmingtonghui/definition").then((module) => module.default),
  },
]);
