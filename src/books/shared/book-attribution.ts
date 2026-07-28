import type { BookAttribution } from "./book-runtime";

export function formatBookAttribution(attribution: BookAttribution): string {
  return `${attribution.name} ${attribution.role}`;
}
