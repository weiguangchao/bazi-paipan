// 大运、流年、流月三级面板：每层均有独立点击态，上层切换时重置下层。
// 词汇遵循 CONTEXT.md（大运、流年、流月、流月柱、十神、节）。
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { DayunOut } from "@/domain/paipan/mingpan";
import { shishenAbbreviation } from "@/utils/wuxing";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DayunPanelProps {
  data: DayunOut;
}

const selectableCardBaseClass =
  "group relative flex h-auto w-16 shrink-0 flex-col gap-0.5 !rounded-none border border-[#ded7ce] bg-[#fffefa] px-1.5 pb-2 pt-3 text-[#282522] shadow-none transition-transform data-[state=on]:bg-[#fffefa] md:w-[3.25rem] md:px-1";

function selectableCardClass(selected: boolean, current: boolean): string {
  return cn(
    selectableCardBaseClass,
    selected
      ? "border-[#282522] shadow-[3px_3px_0_#d9d1c7] hover:bg-[#fffefa]"
      : "hover:-translate-y-0.5 hover:bg-[#fffefa]",
    current && "border-t-[3px] border-t-[#a73532] pt-5",
  );
}

function SelectableLayer({
  label,
  value,
  onValueChange,
  children,
  layerRef,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  layerRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <ToggleGroup
      ref={layerRef}
      type="single"
      spacing={1}
      value={value}
      onValueChange={onValueChange}
      variant="outline"
      aria-label={label}
      className="flex w-full flex-nowrap gap-1.5 overflow-x-auto pb-2 pt-3 [scrollbar-width:thin] md:gap-1"
    >
      {children}
    </ToggleGroup>
  );
}

function scrollCardHorizontallyIntoView(
  layer: HTMLDivElement | null,
  card: HTMLButtonElement | null | undefined,
): void {
  if (!layer || !card) return;

  const layerRect = layer.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  if (cardRect.left < layerRect.left) {
    layer.scrollLeft -= layerRect.left - cardRect.left;
  } else if (cardRect.right > layerRect.right) {
    layer.scrollLeft += cardRect.right - layerRect.right;
  }
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
      <span className={cn("font-serif text-lg text-[#282522]", bold ? "font-bold" : "font-semibold")}>
        {character}
      </span>
      <span className="text-[0.6rem] font-semibold text-[#726b63]">
        {shishenAbbreviation(shishen)}
      </span>
    </div>
  );
}

function CurrentBadge({ children }: { children: ReactNode }) {
  return (
    <span
      data-current-marker="seal"
      className="absolute -top-3 right-1.5 z-10 grid h-7 w-7 place-items-center border border-[#a73532] bg-[#a73532] font-serif text-[0.62rem] font-bold leading-none text-white shadow-[2px_2px_0_#eadbd1]"
    >
      {children}
    </span>
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
    <div className="flex flex-col gap-0.5">
      <ZhuRow character={ganzhi[0]!} shishen={tianganShishen} bold={selected} field={liuyueFields} />
      <ZhuRow character={ganzhi[1]!} shishen={dizhiShishen} bold={selected} field={liuyueFields} />
    </div>
  );
}

function LayerHeading({
  children,
  aside,
}: {
  children: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="font-serif text-base font-semibold tracking-[0.16em] text-[#282522]">
        {children}
      </h3>
      <span className="text-[0.68rem] text-[#776f67]">{aside}</span>
    </div>
  );
}

interface DayunPanelSelection {
  dayunIndex: string;
  liunianIndex: string;
  liuyueIndex: string;
}

function automaticSelection(data: DayunOut): DayunPanelSelection {
  const currentDayunIndex = data.zhu.findIndex((item) => item.isCurrent);
  if (currentDayunIndex < 0) {
    return {
      dayunIndex: data.zhu.length > 0 ? "0" : "",
      liunianIndex: data.zhu[0]?.liunian.length ? "0" : "",
      liuyueIndex: "",
    };
  }

  const currentYearIndex = data.zhu[currentDayunIndex]!.liunian.findIndex(
    (item) => item.isCurrentYear,
  );
  return {
    dayunIndex: String(currentDayunIndex),
    liunianIndex: currentYearIndex < 0 ? "" : String(currentYearIndex),
    liuyueIndex: "",
  };
}

export function DayunPanel({ data }: DayunPanelProps) {
  const [selection, setSelection] = useState<DayunPanelSelection>(() => automaticSelection(data));
  const [autoScrollPending, setAutoScrollPending] = useState(true);
  const dayunLayerRef = useRef<HTMLDivElement>(null);
  const liunianLayerRef = useRef<HTMLDivElement>(null);
  const dayunCardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const liunianCardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const liuyueLayerRef = useRef<HTMLDivElement>(null);
  const {
    dayunIndex: selectedDayunIndex,
    liunianIndex: selectedLiunianIndex,
    liuyueIndex: selectedLiuyueIndex,
  } = selection;

  useLayoutEffect(() => {
    setSelection(automaticSelection(data));
    setAutoScrollPending(true);
  }, [data]);

  useEffect(() => {
    if (!autoScrollPending) return;

    if (selectedDayunIndex !== "") {
      scrollCardHorizontallyIntoView(
        dayunLayerRef.current,
        dayunCardRefs.current[Number(selectedDayunIndex)],
      );
    }
    if (selectedLiunianIndex !== "") {
      scrollCardHorizontallyIntoView(
        liunianLayerRef.current,
        liunianCardRefs.current[Number(selectedLiunianIndex)],
      );
    }
    setAutoScrollPending(false);
  }, [autoScrollPending, selectedDayunIndex, selectedLiunianIndex]);

  useLayoutEffect(() => {
    if (liuyueLayerRef.current) {
      liuyueLayerRef.current.scrollLeft = 0;
    }
  }, [data, selectedDayunIndex, selectedLiunianIndex]);

  const selectedDayunzhu =
    selectedDayunIndex === "" ? undefined : data.zhu[Number(selectedDayunIndex)];
  const selectedLiunianzhu =
    selectedLiunianIndex === "" ? undefined : selectedDayunzhu?.liunian[Number(selectedLiunianIndex)];

  function selectDayun(value: string) {
    if (!value) return;
    if (value !== selectedDayunIndex) {
      const target = data.zhu[Number(value)];
      const currentYearIndex = target?.isCurrent
        ? target.liunian.findIndex((item) => item.isCurrentYear)
        : -1;
      setSelection({
        dayunIndex: value,
        liunianIndex:
          currentYearIndex >= 0 ? String(currentYearIndex) : target?.liunian.length ? "0" : "",
        liuyueIndex: "",
      });
    }
  }

  function selectLiunian(value: string) {
    if (!value) return;
    if (value !== selectedLiunianIndex) {
      setSelection((current) => ({
        ...current,
        liunianIndex: value,
        liuyueIndex: "",
      }));
    }
  }

  function selectLiuyue(value: string) {
    if (value) {
      setSelection((current) => ({ ...current, liuyueIndex: value }));
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 rounded-lg bg-[#f2eee7] p-4 text-[#282522] shadow-inner sm:p-5">
      <section className="min-w-0">
        <LayerHeading
          aside={`起运 ${data.qiyun.ageYears}岁${data.qiyun.ageMonths}月`}
        >
          大运
        </LayerHeading>
        <SelectableLayer
          value={selectedDayunIndex}
          onValueChange={selectDayun}
          label="大运"
          layerRef={dayunLayerRef}
        >
          {data.zhu.map((zhu, index) => {
            const isSelected = selectedDayunIndex === String(index);
            return (
              <ToggleGroupItem
                key={index}
                value={String(index)}
                ref={(element) => {
                  dayunCardRefs.current[index] = element;
                }}
                data-testid="dayun-card"
                aria-label={`${zhu.startYear}年大运，年龄${zhu.qiyun.ageYears}~${zhu.qiyun.ageYears + 9}岁${zhu.isCurrent ? "，当前" : ""}`}
                className={selectableCardClass(isSelected, zhu.isCurrent)}
              >
                {zhu.isCurrent && <CurrentBadge>当前</CurrentBadge>}
                <span className="font-mono text-[0.66rem] font-semibold tracking-tight text-[#726b63]">
                  {zhu.startYear}年
                </span>
                <span className="text-[0.58rem] leading-none text-[#8d857c]">
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
      </section>

      {selectedDayunzhu && (
        <section className="min-w-0">
          <LayerHeading aside={`${selectedDayunzhu.startYear}年起`}>流年</LayerHeading>
          <SelectableLayer
            value={selectedLiunianIndex}
            onValueChange={selectLiunian}
            label="流年"
            layerRef={liunianLayerRef}
          >
            {selectedDayunzhu.liunian.map((item, index) => {
              const isSelected = selectedLiunianIndex === String(index);
              return (
                <ToggleGroupItem
                  key={item.year}
                  value={String(index)}
                  ref={(element) => {
                    liunianCardRefs.current[index] = element;
                  }}
                  data-testid="liunian-card"
                  aria-label={`${item.year}年流年${item.isCurrentYear ? "，今年" : ""}`}
                  className={selectableCardClass(isSelected, item.isCurrentYear)}
                >
                  {item.isCurrentYear && <CurrentBadge>今年</CurrentBadge>}
                  <span className="font-mono text-[0.66rem] font-semibold tracking-tight text-[#726b63]">
                    {item.year}年
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
        </section>
      )}

      {selectedLiunianzhu && (
        <section className="min-w-0">
          <LayerHeading aside={`${selectedLiunianzhu.year}年立春起`}>流月</LayerHeading>
          <SelectableLayer
            value={selectedLiuyueIndex}
            onValueChange={selectLiuyue}
            label="流月"
            layerRef={liuyueLayerRef}
          >
            {selectedLiunianzhu.liuyue.map((item, index) => {
              const isSelected = selectedLiuyueIndex === String(index);
              return (
                <ToggleGroupItem
                  key={`${item.startJie}-${item.ganzhi}`}
                  value={String(index)}
                  data-testid="liuyue-card"
                  aria-label={`${item.startJie}${item.startMonth}月${item.startDay}日流月${item.isCurrent ? "，当前" : ""}`}
                  className={selectableCardClass(isSelected, item.isCurrent)}
                >
                  {item.isCurrent && <CurrentBadge>本月</CurrentBadge>}
                  <span
                    data-liuyue-field
                    className="font-mono text-[0.66rem] font-semibold tracking-tight text-[#726b63]"
                  >
                    {item.startJie}
                  </span>
                  <span data-liuyue-field className="text-[0.58rem] leading-none text-[#8d857c]">
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
        </section>
      )}
    </div>
  );
}
