// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BooksRoutes } from "@/books/shared/BooksRoutes";
import {
  BookRegistry,
  type BookDefinition,
} from "@/books/shared/book-definition";

afterEach(cleanup);

function fixture(failFirst = false) {
  let attempts = 0;
  const loadVolume = vi.fn(async (volumeId: string): Promise<Record<string, string>> => {
    attempts += 1;
    if (failFirst && attempts === 1) throw new Error("network");
    return volumeId === "v1"
      ? { first: "第一篇正文", second: "第二篇正文" }
      : { third: "第三篇正文" };
  });
  const definition: BookDefinition = {
    catalog: {
      book: {
        id: "fixture",
        order: 1,
        title: "测试典籍",
        author: "测试作者",
        description: "测试简介",
        sealLines: ["测试", "典籍"],
      },
      volumes: [
        {
          id: "v1",
          title: "卷一",
          order: 1,
          chapters: [
            { id: "first", title: "第一篇", volumeId: "v1", order: 1 },
            { id: "second", title: "第二篇", volumeId: "v1", order: 2 },
          ],
        },
        {
          id: "v2",
          title: "卷二",
          order: 2,
          chapters: [
            { id: "third", title: "第三篇", volumeId: "v2", order: 1 },
          ],
        },
      ],
    },
    legacyChapterIds: {},
    locateChapter: (chapterId) => (chapterId === "third" ? "v2" : ["first", "second"].includes(chapterId) ? "v1" : undefined),
    loadVolume,
  };
  const loadDefinition = vi.fn(async () => definition);
  const registry = new BookRegistry([
    {
      bookId: "fixture",
      title: "测试典籍",
      author: "测试作者",
      description: "测试简介",
      volumeCount: 2,
      chapterCount: 3,
      loadDefinition,
    },
  ]);
  return { registry, loadDefinition, loadVolume };
}

function renderPath(path: string, registry: BookRegistry) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BooksRoutes registry={registry} />
    </MemoryRouter>,
  );
}

describe("共享典籍页面", () => {
  test("/books 只使用摘要，卡片进入典籍首页而不加载正文", async () => {
    const { registry, loadDefinition, loadVolume } = fixture();
    renderPath("/books", registry);

    expect(screen.getByRole("heading", { level: 1, name: "典籍" })).toBeVisible();
    expect(screen.getByRole("link", { name: /测试典籍/ })).toHaveAttribute("href", "/books/fixture");
    expect(loadDefinition).not.toHaveBeenCalled();
    expect(loadVolume).not.toHaveBeenCalled();
  });

  test("篇章直达只加载所属卷，同卷导航复用缓存，跨卷 focus 预取", async () => {
    const { registry, loadVolume } = fixture();
    renderPath("/books/fixture/chapters/first", registry);

    expect(await screen.findByRole("heading", { level: 1, name: "第一篇" })).toBeVisible();
    expect(await screen.findByText("第一篇正文")).toBeVisible();
    expect(loadVolume).toHaveBeenCalledTimes(1);
    expect(loadVolume).toHaveBeenLastCalledWith("v1", "normal");

    await userEvent.click(screen.getByRole("link", { name: /下一篇.*第二篇/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "第二篇" })).toBeVisible();
    await waitFor(() => expect(loadVolume).toHaveBeenCalledTimes(2));

    const next = screen.getByRole("link", { name: /下一篇.*第三篇/ });
    fireEvent.focus(next);
    await waitFor(() => expect(loadVolume).toHaveBeenLastCalledWith("v2", "normal"));
  });

  test("加载失败保留篇章身份与导航，并只重试当前卷", async () => {
    const { registry, loadVolume } = fixture(true);
    renderPath("/books/fixture/chapters/first", registry);

    expect(await screen.findByRole("heading", { level: 1, name: "第一篇" })).toBeVisible();
    expect(await screen.findByRole("alert")).toHaveTextContent("本卷正文载入失败");
    expect(screen.getByRole("navigation", { name: "相邻篇章" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "重试当前卷" }));
    expect(await screen.findByText("第一篇正文")).toBeVisible();
    expect(loadVolume).toHaveBeenLastCalledWith("v1", "retry");
  });
});
