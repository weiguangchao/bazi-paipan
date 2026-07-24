// 排盘表单：出生资料录入。App 传入 defaultValues（URL 恢复），提交时调用 onSubmit。
// 日期用 shadcn Date of Birth 变体（Popover + Calendar dropdown），时间用 Input type="time"，
// 性别用 RadioGroup，省市用 BirthplaceSelect。表单错误在内部闭合。
import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { zhCN } from "date-fns/locale";
import { computePaipan, type PaipanData } from "@/api/paipan";
import { getBirthDateLimit } from "@/birth-date";
import { getBeijingYearMonth } from "@/beijing-time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BirthplaceSelect } from "@/components/BirthplaceSelect";

export interface BirthData {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  gender: string;
  province: string;
  city: string;
}

interface FormPanelProps {
  defaultValues?: Partial<BirthData>;
  onSubmit: (data: PaipanData) => void;
}

export function FormPanel({ defaultValues, onSubmit }: FormPanelProps) {
  const now = getBeijingYearMonth();
  const limit = getBirthDateLimit(now);

  const initialDate = defaultValues?.date ? new Date(defaultValues.date + "T00:00:00") : undefined;
  const validInitial = initialDate && !isNaN(initialDate.getTime()) ? initialDate : undefined;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(validInitial);
  const [time, setTime] = useState(defaultValues?.time ?? "00:00");
  const [gender, setGender] = useState(defaultValues?.gender ?? "男");
  const [province, setProvince] = useState(defaultValues?.province ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [birthplaceReady, setBirthplaceReady] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGeneralError("");

    const dateString = selectedDate
      ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
      : "";

    setSubmitting(true);
    try {
      const result = await computePaipan({
        date: dateString,
        time,
        gender,
        province,
        city,
      }, now);

      if (!result.ok) {
        setErrors(result.error.fields);
        setGeneralError(result.error.message);
        return;
      }

      onSubmit(result.data);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBirthplaceChange(p: string, c: string) {
    setProvince(p);
    setCity(c);
  }

  const submitDisabled = !birthplaceReady;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      {/* 出生日期 */}
      <div className="grid gap-2">
        <Label htmlFor="date-trigger" className="text-muted-foreground">出生日期</Label>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
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
              onSelect={(date: Date | undefined) => {
                setSelectedDate(date);
                setDateOpen(false);
                if (errors.date) setErrors((p) => ({ ...p, date: "" }));
              }}
              captionLayout="dropdown"
              startMonth={new Date(1900, 0)}
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
          onChange={(e) => {
            setTime(e.target.value);
            if (errors.time) setErrors((p) => ({ ...p, time: "" }));
          }}
          className={cn("[&::-webkit-calendar-picker-indicator]:appearance-none", errors.time && "border-destructive")}
        />
        {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
      </div>

      {/* 性别 */}
      <div className="grid gap-2">
        <Label className="text-muted-foreground">性别</Label>
        <RadioGroup
          value={gender}
          onValueChange={(v) => {
            setGender(v);
            if (errors.gender) setErrors((p) => ({ ...p, gender: "" }));
          }}
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
        defaultProvince={defaultValues?.province}
        defaultCity={defaultValues?.city}
        errors={errors}
        onChange={handleBirthplaceChange}
        onReadyChange={setBirthplaceReady}
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
