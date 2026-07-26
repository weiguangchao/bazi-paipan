// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi } from "vitest";
import {
  MarkdownErrorBoundary,
  RestrictedMarkdown,
  validateChapterMarkdown,
} from "@/books/shared/RestrictedMarkdown";

describe("受限 Markdown", () => {
  test("按原顺序完整渲染白名单、特殊字符与命例，并保留可复制文本", async () => {
    const source = [
      "## 二级题",
      "### 三级题",
      "#### 四级题",
      "##### 五级题",
      "###### 六级题",
      "",
      "**粗体**、*斜体*、`甲子`与[安全链接](https://example.com)，罕字：珞、禄、祿。",
      "",
      "> 原注：乾造甲子　乙丑　丙寅　丁卯",
      "",
      "- 子",
      "- 丑",
      "",
      "1. 寅",
      "2. 卯",
      "",
      "---",
      "",
      "```text",
      "命例：甲子 乙丑 丙寅 丁卯",
      "```",
      "",
      "甲行  ",
      "乙行",
      "",
      "| 年柱 | 月柱 |",
      "| --- | --- |",
      "| 甲子 | 乙丑 |",
    ].join("\n");
    const { container } = render(<RestrictedMarkdown source={source} />);

    for (const level of [2, 3, 4, 5, 6] as const) {
      expect(screen.getByRole("heading", { level })).toBeVisible();
    }
    expect(container.querySelector("strong")).toHaveTextContent("粗体");
    expect(container.querySelector("em")).toHaveTextContent("斜体");
    expect(container.querySelector("code:not(pre code)")).toHaveTextContent("甲子");
    expect(container.querySelector("pre code")).toHaveTextContent("命例：甲子 乙丑 丙寅 丁卯");
    expect(container.querySelectorAll("ul, ol")).toHaveLength(2);
    expect(container.querySelector("hr")).toBeInTheDocument();
    expect(container.querySelector("br")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "安全链接" })).toHaveAttribute("href", "https://example.com");
    expect(screen.getByRole("table").parentElement).toHaveClass("chapter-table-wrap");
    expect(screen.getByRole("blockquote").textContent?.trim()).toBe("原注：乾造甲子　乙丑　丙寅　丁卯");
    expect(container.textContent).toContain("罕字：珞、禄、祿");
    expect([...container.children].map((element) => element.tagName)).toEqual([
      "H2", "H3", "H4", "H5", "H6", "P", "BLOCKQUOTE", "UL", "OL", "HR", "PRE", "P", "DIV",
    ]);

    const range = document.createRange();
    range.selectNodeContents(container);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    const clipboard = await userEvent.setup().copy();
    expect(clipboard).toBeDefined();
    if (!clipboard) throw new Error("复制操作未返回 clipboard 数据");
    expect(clipboard.getData("text/plain")).toContain("罕字：珞、禄、祿");
    expect(clipboard.getData("text/plain")).toContain("命例：甲子 乙丑 丙寅 丁卯");
  });

  test.each([
    ["<script>alert(1)</script>", "原始 HTML"],
    ["![图](https://example.com/a.png)", "图片或嵌入内容"],
    ["[危险](javascript:alert(1))", "危险链接"],
    ["正文\uFFFD", "不可识别字符"],
  ])("阻断 %s", (source, message) => {
    expect(() => validateChapterMarkdown(source)).toThrow(message);
  });

  test("内容校验失败时显示安全错误而不是抛出导致白屏", () => {
    render(<RestrictedMarkdown source={"<script>alert(1)</script>"} />);

    expect(screen.getByRole("alert")).toHaveTextContent("本篇内容无法安全渲染");
    expect(screen.getByRole("alert")).toHaveTextContent("禁止的原始 HTML");
  });

  test("解析器异常由边界转成安全错误", () => {
    function ThrowingParser(): never {
      throw new Error("解析器异常");
    }
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const { container } = render(
        <MarkdownErrorBoundary>
          <ThrowingParser />
        </MarkdownErrorBoundary>,
      );
      expect(container.querySelector("[role='alert']")).toHaveTextContent("本篇内容无法安全渲染");
      expect(container.querySelector("[role='alert']")).toHaveTextContent("解析器异常");
    } finally {
      consoleError.mockRestore();
    }
  });
});
