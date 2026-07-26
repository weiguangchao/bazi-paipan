// 大运、流年、流月三级面板：每层均由用户点击后展开下一层，当前标记与点击态分离。
// 词汇遵循 CONTEXT.md（大运、流年、流月、流月柱、十神、节）。
import { type ReactNode, useEffect, useState } from "react";
import type { DayunOut } from "@/domain/paipan/mingpan";
import { shishenAbbreviation } from "@/utils/wuxing";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DayunPanelProps {
  data: DayunOut;
}

const selectableCardBaseClass =
  "group flex h-auto w-16 shrink-0 flex-col gap-0.5 rounded-md border border-border p-1.5 shadow-none data-[state=on]:bg-transparent";

function selectableCardClass(selected: boolean, relative = false): string {
  return cn(
    selectableCardBaseClass,
    relative && "relative",
    selected ? "hover:bg-transparent" : "hover:bg-accent/5",
  );
}

function SelectableLayer({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={onValueChange}
      variant="outline"
      aria-label={label}
      className="flex w-full flex-nowrap gap-1.5 overflow-x-auto rounded-lg border border-border p-1"
    >
      {children}
    </ToggleGroup>
  );
}

function ZhuRow({
  character,
  shishen,
  bold,
  field,
}: {
  character: string;
  shishen: string;
  bold?: boolean;
  field?: boolean;
}) {
  return (
    <div
      className="flex min-h-7 items-baseline justify-center gap-1.5"
      {...(field ? { "data-liuyue-field": "" } : {})}
    >
      <span className={cn("font-serif text-lg text-foreground", bold ? "font-bold" : "font-semibold")}>
        {character}
      </span>
      <span className="text-xs font-semibold text-accent">{shishenAbbreviation(shishen)}</span>
    </div>
  );
}

function SelectionUnderline({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-0 left-1/2 h-0.5 -translate-x-1/2 bg-accent transition-[width] duration-200 ease-out motion-reduce:transition-none",
        selected ? "w-[88%]" : "w-0 group-hover:w-[70%]",
      )}
    />
  );
}

function GanzhiRows({
  ganzhi,
  tianganShishen,
  dizhiShishen,
  selected,
  liuyueFields,
}: {
  ganzhi: string;
  tianganShishen: string;
  dizhiShishen: string;
  selected: boolean;
  liuyueFields?: boolean;
}) {
  return (
    <div className="relative flex flex-col gap-0.5 pb-[3px]">
      <ZhuRow character={ganzhi[0]!} shishen={tianganShishen} bold={selected} field={liuyueFields} />
      <ZhuRow character={ganzhi[1]!} shishen={dizhiShishen} bold={selected} field={liuyueFields} />
      <SelectionUnderline selected={selected} />
    </div>
  );
}

export function DayunPanel({ data }: DayunPanelProps) {
  const [selectedDayunIndex, setSelectedDayunIndex] = useState("");
  const [selectedLiunianIndex, setSelectedLiunianIndex] = useState("");
  const [selectedLiuyueIndex, setSelectedLiuyueIndex] = useState("");

  useEffect(() => {
    setSelectedDayunIndex("");
    setSelectedLiunianIndex("");
    setSelectedLiuyueIndex("");
  }, [data]);

  const selectedDayunzhu =
    selectedDayunIndex === "" ? undefined : data.zhu[Number(selectedDayunIndex)];
  const selectedLiunianzhu =
    selectedLiunianIndex === "" ? undefined : selectedDayunzhu?.liunian[Number(selectedLiunianIndex)];

  function selectDayun(value: string) {
    if (!value) return;
    if (value !== selectedDayunIndex) {
      setSelectedDayunIndex(value);
      setSelectedLiunianIndex("");
      setSelectedLiuyueIndex("");
    }
  }

  function selectLiunian(value: string) {
    if (!value) return;
    if (value !== selectedLiunianIndex) {
      setSelectedLiunianIndex(value);
      setSelectedLiuyueIndex("");
    }
  }

  function selectLiuyue(value: string) {
    if (value) setSelectedLiuyueIndex(value);
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        方向：{data.direction}行；起运 {data.qiyun.ageYears}岁{data.qiyun.ageMonths}月
      </p>

      <SelectableLayer
        value={selectedDayunIndex}
        onValueChange={selectDayun}
        label="大运"
      >
        {data.zhu.map((zhu, index) => {
          const isSelected = selectedDayunIndex === String(index);
          return (
            <ToggleGroupItem
              key={index}
              value={String(index)}
              data-testid="dayun-card"
              aria-label={`${zhu.startYear}年大运，年龄${zhu.qiyun.ageYears}~${zhu.qiyun.ageYears + 9}岁${zhu.isCurrent ? "，当前" : ""}`}
              className={selectableCardClass(isSelected)}
            >
              <span className="relative w-full text-center">
                <span className={cn("text-xs font-semibold", isSelected ? "text-accent" : "text-muted-foreground")}>
                  {zhu.startYear}
                </span>
                {zhu.isCurrent && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-3 whitespace-nowrap rounded-full bg-accent px-1 text-[0.55rem] font-bold leading-tight text-accent-foreground">
                    当前
                  </span>
                )}
              </span>
              <span className="text-[0.6rem] leading-none text-muted-foreground">
                {zhu.qiyun.ageYears}~{zhu.qiyun.ageYears + 9}岁
              </span>
              <GanzhiRows
                ganzhi={zhu.ganzhi}
                tianganShishen={zhu.tianganShishen}
                dizhiShishen={zhu.dizhiShishen}
                selected={isSelected}
              />
            </ToggleGroupItem>
          );
        })}
      </SelectableLayer>

      {selectedDayunzhu && (
        <SelectableLayer
          value={selectedLiunianIndex}
          onValueChange={selectLiunian}
          label="流年"
        >
          {selectedDayunzhu.liunian.map((item, index) => {
            const isSelected = selectedLiunianIndex === String(index);
            return (
              <ToggleGroupItem
                key={item.year}
                value={String(index)}
                data-testid="liunian-card"
                aria-label={`${item.year}年流年${item.isCurrentYear ? "，今年" : ""}`}
                className={selectableCardClass(isSelected)}
              >
                <span className="relative w-full text-center">
                  <span className={cn("text-xs font-semibold", isSelected ? "text-accent" : "text-muted-foreground")}>
                    {item.year}
                  </span>
                  {item.isCurrentYear && (
                    <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-3 whitespace-nowrap rounded-full bg-accent px-1 text-[0.55rem] font-bold leading-tight text-accent-foreground">
                      今年
                    </span>
                  )}
                </span>
                <GanzhiRows
                  ganzhi={item.ganzhi}
                  tianganShishen={item.tianganShishen}
                  dizhiShishen={item.dizhiShishen}
                  selected={isSelected}
                />
              </ToggleGroupItem>
            );
          })}
        </SelectableLayer>
      )}

      {selectedLiunianzhu && (
        <SelectableLayer
          value={selectedLiuyueIndex}
          onValueChange={selectLiuyue}
          label="流月"
        >
          {selectedLiunianzhu.liuyue.map((item, index) => {
            const isSelected = selectedLiuyueIndex === String(index);
            return (
              <ToggleGroupItem
                key={item.startUtcMs}
                value={String(index)}
                data-testid="liuyue-card"
                aria-label={`${item.startJie}${item.startMonth}月${item.startDay}日流月${item.isCurrent ? "，当前" : ""}`}
                className={selectableCardClass(isSelected, true)}
              >
                {item.isCurrent && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-3 whitespace-nowrap rounded-full bg-accent px-1 text-[0.55rem] font-bold leading-tight text-accent-foreground">
                    当前
                  </span>
                )}
                <span data-liuyue-field className={cn("text-xs font-semibold", isSelected ? "text-accent" : "text-muted-foreground")}>
                  {item.startJie}
                </span>
                <span data-liuyue-field className="text-[0.6rem] leading-none text-muted-foreground">
                  {item.startMonth}/{item.startDay}
                </span>
                <GanzhiRows
                  ganzhi={item.ganzhi}
                  tianganShishen={item.tianganShishen}
                  dizhiShishen={item.dizhiShishen}
                  selected={isSelected}
                  liuyueFields
                />
              </ToggleGroupItem>
            );
          })}
        </SelectableLayer>
      )}
    </div>
  );
}
