// 干支关系留意栏：天干/地支留意 tag 列表。纯展示，数据由 API 计算。
// 词汇遵循 CONTEXT.md（干支关系、天干相克、天干五合、地支六冲、地支六合、地支三合、地支半三合、地支相刑）。
import type { GanzhiRelationsResult } from "@/domain/ganzhi/ganzhi-relations";
import { cn } from "@/lib/utils";

interface GanzhiRelationsProps {
  data: GanzhiRelationsResult;
}

const strongTypes = new Set(["tianganxiangke", "dizhiliuchong"]);

export function GanzhiRelations({ data }: GanzhiRelationsProps) {
  const rows = [
    { label: "天干留意", items: data.tiangan },
    { label: "地支留意", items: data.dizhi },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={cn("grid grid-cols-[104px_minmax(0,1fr)] min-h-14", i > 0 && "border-t border-border")}
        >
          <div className="flex items-center justify-center border-r border-border bg-muted/30 px-2 text-sm font-medium text-muted-foreground">
            {row.label}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 px-3 py-2.5">
            {row.items.length === 0 ? (
              <span className="text-sm text-muted-foreground">无须留意</span>
            ) : (
              row.items.map((item, j) => (
                <span
                  key={j}
                  className={cn(
                    "inline-flex min-h-7.5 items-center rounded-full border px-2.5 font-serif text-sm whitespace-nowrap",
                    strongTypes.has(item.type)
                      ? "border-red-200 bg-red-50 text-foreground"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {item.text}
                </span>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
