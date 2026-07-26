// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test } from "vitest";
import { RestrictedMarkdown, validateChapterMarkdown } from "@/pages/books/yuanhaiziping/RestrictedMarkdown";

describe("受限 Markdown", () => {
  test("渲染白名单语义并为表格提供独立滚动容器", () => {
    render(
      <RestrictedMarkdown
        source={"## 小题\n\n**粗体**与[安全链接](https://example.com)\n\n> 原注\n\n| 年柱 | 月柱 |\n| --- | --- |\n| 甲子 | 乙丑 |"}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "小题" })).toBeVisible();
    expect(screen.getByRole("link", { name: "安全链接" })).toHaveAttribute("href", "https://example.com");
    expect(screen.getByRole("table").parentElement).toHaveClass("chapter-table-wrap");
    expect(screen.getByRole("blockquote")).toHaveTextContent("原注");
  });

  test.each([
    ["<script>alert(1)</script>", "原始 HTML"],
    ["![图](https://example.com/a.png)", "图片或嵌入内容"],
    ["[危险](javascript:alert(1))", "危险链接"],
    ["正文\uFFFD", "不可识别字符"],
  ])("阻断 %s", (source, message) => {
    expect(() => validateChapterMarkdown(source)).toThrow(message);
  });
});
