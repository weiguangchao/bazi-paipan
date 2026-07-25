// 出生省市级联选择：两个 Combobox（Popover + Command），数据直接 import CITIES。
// 词汇遵循 CONTEXT.md（出生资料）。省留空 = 不选（按北京时间），市随省联动。
import { useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { CITIES } from "@/data/cities.generated";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BirthplaceSelectProps {
  defaultProvince?: string;
  defaultCity?: string;
  errors?: { province?: string; city?: string };
  onChange: (province: string, city: string) => void;
  onReadyChange?: (ready: boolean) => void;
}

const provinces = Object.keys(CITIES);

export function BirthplaceSelect({ defaultProvince, defaultCity, errors, onChange, onReadyChange }: BirthplaceSelectProps) {
  const [province, setProvince] = useState(defaultProvince ?? "");
  const [city, setCity] = useState(defaultCity ?? "");
  const [provOpen, setProvOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const cities = province ? Object.keys(CITIES[province] ?? {}) : [];
  const cityDisabled = !province;

  function selectProvince(value: string) {
    const next = value === province ? "" : value;
    setProvince(next);
    setCity("");
    setProvOpen(false);
    onReadyChange?.(true);
    onChange(next, "");
  }

  function selectCity(value: string) {
    const next = value === city ? "" : value;
    setCity(next);
    setCityOpen(false);
    onChange(province, next);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="province-trigger" className="text-muted-foreground">出生省</Label>
        <Popover open={provOpen} onOpenChange={setProvOpen}>
          <PopoverTrigger asChild>
            <Button
              id="province-trigger"
              variant="outline"
              role="combobox"
              aria-expanded={provOpen}
              className={cn(
                "w-full justify-between font-normal",
                !province && "text-muted-foreground",
                errors?.province && "border-destructive",
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                {province || "不选（按北京时间）"}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
            <Command>
              <CommandInput placeholder="搜索省份…" />
              <CommandList>
                <CommandEmpty>未找到省份</CommandEmpty>
                <CommandGroup>
                  {provinces.map((p) => (
                    <CommandItem key={p} value={p} onSelect={selectProvince}>
                      <Check className={cn("mr-2 size-4", province === p ? "opacity-100" : "opacity-0")} />
                      {p}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors?.province && <p className="text-xs text-destructive">{errors.province}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="city-trigger" className="text-muted-foreground">出生市</Label>
        <Popover open={cityOpen && !cityDisabled} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              id="city-trigger"
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              disabled={cityDisabled}
              className={cn(
                "w-full justify-between font-normal",
                !city && "text-muted-foreground",
                errors?.city && "border-destructive",
              )}
            >
              <span className="truncate">
                {city || (cityDisabled ? "请先选择省份" : "选择城市")}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
            <Command>
              <CommandInput placeholder="搜索城市…" />
              <CommandList>
                <CommandEmpty>未找到城市</CommandEmpty>
                <CommandGroup>
                  {cities.map((c) => (
                    <CommandItem key={c} value={c} onSelect={selectCity}>
                      <Check className={cn("mr-2 size-4", city === c ? "opacity-100" : "opacity-0")} />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors?.city && <p className="text-xs text-destructive">{errors.city}</p>}
      </div>
    </div>
  );
}
