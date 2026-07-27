import type { BookCatalog } from "./navigation";

export type VolumeLoadMode = "normal" | "retry";

export interface BookDefinition {
  catalog: BookCatalog;
  legacyChapterIds: Readonly<Record<string, string>>;
  locateChapter(chapterId: string): string | undefined;
  loadVolume(volumeId: string, mode: VolumeLoadMode): Promise<Record<string, string>>;
}

export interface BookSummary {
  bookId: string;
  title: string;
  author: string;
  description: string;
  volumeCount: number;
  chapterCount: number;
  loadDefinition(): Promise<BookDefinition>;
}

export function summaryFromCatalog(
  catalog: BookCatalog,
  loadDefinition: () => Promise<BookDefinition>,
): BookSummary {
  return {
    bookId: catalog.book.id,
    title: catalog.book.title,
    author: catalog.book.author,
    description: catalog.book.description,
    volumeCount: catalog.volumes.length,
    chapterCount: catalog.volumes.reduce(
      (total, volume) => total + volume.chapters.length,
      0,
    ),
    loadDefinition,
  };
}

export class BookRegistry {
  readonly #summaries: readonly BookSummary[];
  readonly #summaryById: ReadonlyMap<string, BookSummary>;

  constructor(summaries: readonly BookSummary[]) {
    this.#summaries = [...summaries];
    this.#summaryById = new Map(summaries.map((summary) => [summary.bookId, summary]));
  }

  list(): readonly BookSummary[] {
    return this.#summaries;
  }

  find(bookId: string): BookSummary | undefined {
    return this.#summaryById.get(bookId);
  }
}
