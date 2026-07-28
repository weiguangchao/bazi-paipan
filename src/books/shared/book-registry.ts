import type {
  BookAttribution,
  BookCatalog,
  BookRuntime,
} from "./book-runtime";

export interface BookSummary {
  readonly bookId: string;
  readonly title: string;
  readonly attribution: BookAttribution;
  readonly description: string;
  readonly volumeCount: number;
  readonly chapterCount: number;
  loadRuntime(): Promise<BookRuntime>;
}

export function summaryFromCatalog(
  catalog: BookCatalog,
  loadRuntime: () => Promise<BookRuntime>,
): BookSummary {
  return {
    bookId: catalog.book.id,
    title: catalog.book.title,
    attribution: catalog.book.attribution,
    description: catalog.book.description,
    volumeCount: catalog.volumes.length,
    chapterCount: catalog.volumes.reduce(
      (total, volume) => total + volume.chapters.length,
      0,
    ),
    loadRuntime,
  };
}

export class BookRegistry {
  readonly #summaries: readonly BookSummary[];
  readonly #summaryById: ReadonlyMap<string, BookSummary>;

  constructor(summaries: readonly BookSummary[]) {
    this.#summaries = [...summaries];
    this.#summaryById = new Map(
      summaries.map((summary) => [summary.bookId, summary]),
    );
  }

  list(): readonly BookSummary[] {
    return this.#summaries;
  }

  find(bookId: string): BookSummary | undefined {
    return this.#summaryById.get(bookId);
  }
}
