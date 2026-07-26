export function chapterContentFromModules(modules: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(modules).map(([modulePath, source]) => {
      const id = modulePath.match(/(v[1-5]-c\d{3})\.md$/)?.[1];
      if (!id || typeof source !== "string") {
        throw new Error("卷正文模块格式无效");
      }
      return [id, source];
    }),
  );
}
