// 四柱展示：年月日时四柱表格，含天干十神、藏干十神、五行着色。
// 词汇遵循 CONTEXT.md（四柱、柱、天干、地支、藏干、十神、五行）。
import type { SizhuOut } from "@/api/paipan";
import { getWuxing, wuxingTextColors } from "@/lib/wuxing";
import { cn } from "@/lib/utils";

const wuxingSymbols: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

interface SizhuTableProps {
  sizhu: SizhuOut;
}

const columns = [
  { label: "年柱", key: "year" as const },
  { label: "月柱", key: "month" as const },
  { label: "日柱", key: "day" as const },
  { label: "时柱", key: "hour" as const },
];

export function SizhuTable({ sizhu }: SizhuTableProps) {
  const zhuList = columns.map((col) => ({ label: col.label, data: sizhu[col.key] }));
  const rows = [
    { label: "十神", render: (z: typeof zhuList[number]) => <span className="text-sm">{z.data.shishen}</span> },
    { label: "天干", render: (z: typeof zhuList[number]) => (
      <span className={cn("relative text-2xl font-bold", wuxingTextColors[getWuxing(z.data.ganzhi[0]!)])}>
        {z.data.ganzhi[0]}
        <span className="ml-0.5 text-xs">{wuxingSymbols[getWuxing(z.data.ganzhi[0]!)]}</span>
      </span>
    )},
    { label: "地支", render: (z: typeof zhuList[number]) => (
      <span className={cn("relative text-2xl font-bold", wuxingTextColors[getWuxing(z.data.ganzhi[1]!)])}>
        {z.data.ganzhi[1]}
        <span className="ml-0.5 text-xs">{wuxingSymbols[getWuxing(z.data.ganzhi[1]!)]}</span>
      </span>
    )},
    { label: "藏干", render: (z: typeof zhuList[number]) => (
      <div className="flex flex-col gap-0.5 text-sm">
        {z.data.canggan.map((c, i) => (
          <div key={i} className="flex items-baseline justify-center gap-1.5">
            <span className={cn("font-bold", wuxingTextColors[getWuxing(c.tiangan)])}>{c.tiangan}</span>
            <span className="text-muted-foreground text-xs">{c.shishen}</span>
          </div>
        ))}
      </div>
    )},
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-[16%_repeat(4,minmax(0,1fr))]">
        {/* 日期行 */}
        <div className="flex items-center justify-center border-b border-border bg-muted/30 py-2.5 text-sm text-muted-foreground">
          日期
        </div>
        {zhuList.map((z) => (
          <div key={z.label} className="border-b border-l border-border bg-muted/30 py-2.5 text-center text-sm text-muted-foreground">
            {z.label}
          </div>
        ))}
        {rows.map((row, ri) => (
          <div key={row.label} className="contents">
            <div className={cn("flex items-center justify-center px-2 py-2.5 text-sm text-muted-foreground", ri % 2 === 0 ? "bg-background" : "bg-muted/20")}>
              {row.label}
            </div>
            {zhuList.map((z) => (
              <div key={z.label} className={cn("border-l border-border px-2 py-2.5 text-center", ri % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                {row.render(z)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
