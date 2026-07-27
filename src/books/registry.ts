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
  {
    bookId: "wudenghuiyuan",
    title: "五灯会元",
    author: "（宋）释普济",
    description: "汇集禅宗五灯法脉人物传记与机缘语录，依原卷次查阅二十卷一千七百三十九篇正文。",
    volumeCount: 20,
    chapterCount: 1739,
    loadDefinition: () => import("./wudenghuiyuan/definition").then((module) => module.default),
  },
]);
