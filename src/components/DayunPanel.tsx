// 大运与流年面板：大运用 Radix ToggleGroup type="single" 实现单选，选中刷新流年。
// 当前（isCurrent）仅决定初始选中与 badge，与选中态解耦。流年纯展示不可点。
// 词汇遵循 CONTEXT.md（大运、大运柱、起运、流年、流年柱、十神）。
import { useState } from "react";
import type { DayunOut } from "@/api/paipan";
import { getWuxing, shishenAbbreviation, wuxingTextColors } from "@/lib/wuxing";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DayunPanelProps {
  data: DayunOut;
}

function ZhuRow({ character, shishen }: { character: string; shishen: string }) {
  return (
    <div className="flex items-baseline justify-center gap-1.5 min-h-7">
      <span className={cn("font-serif text-lg font-semibold", wuxingTextColors[getWuxing(character)])}>
        {character}
      </span>
      <span className="text-xs font-semibold text-accent">{shishenAbbreviation(shishen)}</span>
    </div>
  );
}

export function DayunPanel({ data }: DayunPanelProps) {
  const initialIndex = data.zhu.findIndex((z) => z.isCurrent);
  const defaultIndex = initialIndex >= 0 ? String(initialIndex) : "0";
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const index = parseInt(selectedIndex, 10);
  const selectedZhu = data.zhu[index] ?? data.zhu[0]!;

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        方向：{data.direction}行；起运 {data.qiyun.ageYears}岁{data.qiyun.ageMonths}月
      </p>

      <ToggleGroup
        type="single"
        value={selectedIndex}
        onValueChange={(v: string) => v && setSelectedIndex(v)}
        variant="outline"
        className="flex w-full flex-nowrap gap-1.5 overflow-x-auto rounded-lg border border-border p-1"
      >
        {data.zhu.map((zhu, i) => (
          <ToggleGroupItem
            key={i}
            value={String(i)}
            aria-label={`${zhu.startYear}年大运，年龄${zhu.qiyun.ageYears}~${zhu.qiyun.ageYears + 9}岁${zhu.isCurrent ? "，当前" : ""}`}
            className="flex h-auto w-16 shrink-0 flex-col gap-0.5 rounded-md border border-border p-1.5 data-[state=on]:border-accent data-[state=on]:bg-accent/10 data-[state=on]:shadow-[inset_0_-3px_0_var(--color-accent)]"
          >
            <span className="relative w-full text-center">
              <span className="text-xs font-semibold text-muted-foreground">{zhu.startYear}</span>
              {zhu.isCurrent && (
                <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-3 rounded-full bg-accent px-1 text-[0.55rem] font-bold leading-tight text-accent-foreground">
                  当前
                </span>
              )}
            </span>
            <span className="text-[0.6rem] leading-none text-muted-foreground">
              {zhu.qiyun.ageYears}~{zhu.qiyun.ageYears + 9}岁
            </span>
            <ZhuRow character={zhu.ganzhi[0]!} shishen={zhu.tianganShishen} />
            <ZhuRow character={zhu.ganzhi[1]!} shishen={zhu.dizhiShishen} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex flex-nowrap gap-1.5 overflow-x-auto rounded-lg border border-border p-1">
        {selectedZhu.liunian.map((item) => (
          <div
            key={item.year}
            className="flex h-auto w-16 shrink-0 flex-col gap-0.5 rounded-md border border-border bg-card p-1.5 text-center"
          >
            <span className="relative">
              <span className="text-xs font-semibold text-muted-foreground">{item.year}</span>
              {item.isCurrentYear && (
                <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-3 rounded-full bg-accent px-1 text-[0.55rem] font-bold leading-tight text-accent-foreground">
                  今年
                </span>
              )}
            </span>
            <ZhuRow character={item.ganzhi[0]!} shishen={item.tianganShishen} />
            <ZhuRow character={item.ganzhi[1]!} shishen={item.dizhiShishen} />
          </div>
        ))}
      </div>
    </div>
  );
}
