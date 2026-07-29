import type { BookAttribution } from "./book-runtime";

export function formatBookAttribution(attribution: BookAttribution): string {
  return attribution
    .map(({ name, role }) => `${name} ${role}`)
    .join(" · ");
}
