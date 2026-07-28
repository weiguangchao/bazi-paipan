// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BooksRoutes } from "@/books/shared/BooksRoutes";
import {
  BookRegistry,
  summaryFromCatalog,
} from "@/books/shared/book-registry";
import {
  createBookRuntime,
  type BookCatalog,
  type BookRuntime,
} from "@/books/shared/book-runtime";

afterEach(cleanup);

const catalog: BookCatalog = {
  book: {
    id: "fixture",
    order: 1,
    title: "测试典籍",
    attribution: {
      name: "测试译者",
      role: "译",
    },
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
};

function fixture(failFirst = false) {
  let attempts = 0;
  const baseRuntime = createBookRuntime(catalog, {
    v1: async () => {
      attempts += 1;
      if (failFirst && attempts === 1) throw new Error("network");
      return { default: { first: "第一篇正文", second: "第二篇正文" } };
    },
    v2: async () => ({ default: { third: "第三篇正文" } }),
  });
  const readChapter = vi.fn(baseRuntime.readChapter);
  const runtime: BookRuntime = { ...baseRuntime, readChapter };
  const loadRuntime = vi.fn(async () => runtime);
  const registry = new BookRegistry([
    summaryFromCatalog(catalog, loadRuntime),
  ]);
  return { registry, loadRuntime, readChapter };
}

function renderPath(path: string, registry: BookRegistry) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BooksRoutes registry={registry} />
    </MemoryRouter>,
  );
}

describe("共享典籍页面", () => {
  test("/books 只使用摘要，卡片进入典籍首页而不加载 runtime", () => {
    const { registry, loadRuntime, readChapter } = fixture();
    renderPath("/books", registry);

    expect(screen.getByRole("heading", { level: 1, name: "典籍" })).toBeVisible();
    expect(screen.getByRole("link", { name: /测试典籍/ })).toHaveAttribute(
      "href",
      "/books/fixture",
    );
    expect(screen.getByRole("link", { name: /测试典籍/ })).toHaveTextContent(
      "测试译者 译",
    );
    expect(loadRuntime).not.toHaveBeenCalled();
    expect(readChapter).not.toHaveBeenCalled();
  });

  test("单部典籍首页使用主题中立身份并展示 catalog 署名", async () => {
    const { registry } = fixture();
    renderPath("/books/fixture", registry);

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "测试典籍",
    })).toBeVisible();
    expect(screen.getByText("典籍 · 2 卷 · 3 篇")).toBeVisible();
    expect(screen.getByRole("heading", {
      level: 2,
      name: "测试译者 译",
    })).toBeVisible();
  });

  test("正文读取未完成时显示加载提示并保留篇章身份", async () => {
    const baseRuntime = createBookRuntime(catalog, {
      v1: async () => ({ default: { first: "第一篇正文", second: "第二篇正文" } }),
      v2: async () => ({ default: { third: "第三篇正文" } }),
    });
    const runtime: BookRuntime = {
      ...baseRuntime,
      readChapter: vi.fn(
        (_chapterId: string) => new Promise<never>(() => undefined),
      ),
    };
    const registry = new BookRegistry([
      summaryFromCatalog(catalog, async () => runtime),
    ]);

    renderPath("/books/fixture/chapters/first", registry);

    expect(await screen.findByRole("heading", { level: 1, name: "第一篇" })).toBeVisible();
    expect(screen.getByText("正在载入本卷正文…")).toBeVisible();
  });

  test("篇章直达读取正文，跨卷 focus 只表达预取意图且不改变当前渲染", async () => {
    const { registry, readChapter } = fixture();
    renderPath("/books/fixture/chapters/first", registry);

    expect(await screen.findByRole("heading", { level: 1, name: "第一篇" })).toBeVisible();
    expect(await screen.findByText("第一篇正文")).toBeVisible();
    expect(readChapter).toHaveBeenCalledWith("first");

    await userEvent.click(screen.getByRole("link", { name: /下一篇.*第二篇/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "第二篇" })).toBeVisible();
    expect(await screen.findByText("第二篇正文")).toBeVisible();

    const next = screen.getByRole("link", { name: /下一篇.*第三篇/ });
    fireEvent.focus(next);
    await waitFor(() => expect(readChapter).toHaveBeenCalledWith("third"));
    expect(screen.getByRole("heading", { level: 1, name: "第二篇" })).toBeVisible();
    expect(screen.getByText("第二篇正文")).toBeVisible();
  });

  test("加载失败保留篇章身份与导航，点击重试仍调用同一个读取接口", async () => {
    const { registry, readChapter } = fixture(true);
    renderPath("/books/fixture/chapters/first", registry);

    expect(await screen.findByRole("heading", { level: 1, name: "第一篇" })).toBeVisible();
    expect(await screen.findByRole("alert")).toHaveTextContent("本卷正文载入失败");
    expect(screen.getByRole("navigation", { name: "相邻篇章" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "重试当前卷" }));
    expect(await screen.findByText("第一篇正文")).toBeVisible();
    expect(readChapter).toHaveBeenLastCalledWith("first");
  });
});
