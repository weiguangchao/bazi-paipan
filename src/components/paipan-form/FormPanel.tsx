// 排盘表单：纯展示组件。状态与逻辑由父组件（App 通过 usePaipanForm）注入。
// 日期用 shadcn Date of Birth 变体（Popover + Calendar dropdown），时间用 Input type="time"，
// 性别用 RadioGroup，省市用 BirthplaceSelect。表单错误在内部闭合。
import { CalendarIcon } from "lucide-react";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BirthplaceSelect } from "@/components/paipan-form/BirthplaceSelect";

export interface PaipanFormValues {
  date: string;
  time: string;
  gender: string;
  province: string;
  city: string;
}

interface FormPanelProps {
  values: PaipanFormValues;
  errors: Record<string, string>;
  generalError: string;
  submitting: boolean;
  selectedDate: Date | undefined;
  dateOpen: boolean;
  dateLimit: { year: number; month: number; day: number };
  onSubmit: (e: React.FormEvent) => void;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  onGenderChange: (gender: string) => void;
  onBirthplaceChange: (province: string, city: string) => void;
  onDateOpenChange: (open: boolean) => void;
}

export function FormPanel({
  values,
  errors,
  generalError,
  submitting,
  selectedDate,
  dateOpen,
  dateLimit,
  onSubmit,
  onDateChange,
  onTimeChange,
  onGenderChange,
  onBirthplaceChange,
  onDateOpenChange,
}: FormPanelProps) {
  const { time, gender, province, city } = values;
  const limit = dateLimit;
  const submitDisabled = false;

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {/* 出生日期 */}
      <div className="grid gap-2">
        <Label htmlFor="date-trigger" className="text-muted-foreground">出生日期</Label>
        <Popover open={dateOpen} onOpenChange={onDateOpenChange}>
          <PopoverTrigger asChild>
            <Button
              id="date-trigger"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground",
                errors.date && "border-destructive",
              )}
            >
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              {selectedDate
                ? selectedDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
                : "选择出生日期"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateChange}
              captionLayout="dropdown"
              startMonth={new Date(1801, 0)}
              endMonth={new Date(limit.year, limit.month - 1)}
              locale={zhCN}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
      </div>

      {/* 出生时间 */}
      <div className="grid gap-2">
        <Label htmlFor="time" className="text-muted-foreground">出生时间</Label>
        <Input
          id="time"
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className={cn("[&::-webkit-calendar-picker-indicator]:appearance-none", errors.time && "border-destructive")}
        />
        {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
      </div>

      {/* 性别 */}
      <div className="grid gap-2">
        <Label className="text-muted-foreground">性别</Label>
        <RadioGroup
          value={gender}
          onValueChange={onGenderChange}
          className="flex flex-row gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="男" id="gender-male" />
            <Label htmlFor="gender-male" className="cursor-pointer font-normal">男</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="女" id="gender-female" />
            <Label htmlFor="gender-female" className="cursor-pointer font-normal">女</Label>
          </div>
        </RadioGroup>
        {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
      </div>

      {/* 出生地 */}
      <BirthplaceSelect
        defaultProvince={province || undefined}
        defaultCity={city || undefined}
        errors={errors}
        onChange={onBirthplaceChange}
      />

      <Button type="submit" disabled={submitDisabled || submitting} className="w-full">
        {submitting ? "排盘中…" : "排盘"}
      </Button>

      {generalError && (
        <p className="rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">{generalError}</p>
      )}
    </form>
  );
}
