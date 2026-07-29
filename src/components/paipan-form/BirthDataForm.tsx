import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { zhCN } from "date-fns/locale";
import {
  parse,
  type BirthDataInput,
  type BirthProfile,
} from "@/domain/birth/birth-profile";
import { getBirthDateLimit, parseBirthDate } from "@/domain/birth/birth-date";
import { CITIES } from "@/data/cities.generated";
import { BirthplaceSelect } from "@/components/paipan-form/BirthplaceSelect";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface BirthDataSubmission {
  readonly profile: BirthProfile;
  readonly snapshot: Readonly<BirthDataInput>;
}

interface BirthDataFormProps {
  initialInput?: BirthDataInput;
  onSubmit: (submission: BirthDataSubmission) => void;
}

const DEFAULT_BIRTH_DATA: BirthDataInput = {
  date: "2000-01-01",
  time: "00:00",
  gender: "男",
  province: "",
  city: "",
};

const BIRTH_DATE_LIMIT = getBirthDateLimit();

function localDate(date: string): Date | undefined {
  const parsed = parseBirthDate(date);
  if (!parsed) return undefined;
  return new Date(parsed.year, parsed.month - 1, parsed.day);
}

function dateString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function initialDraft(
  initialInput: BirthDataInput | undefined,
): BirthDataInput {
  const initialDate = initialInput?.date;
  return {
    date:
      initialDate && parseBirthDate(initialDate)
        ? initialDate
        : DEFAULT_BIRTH_DATA.date,
    time: initialInput?.time || DEFAULT_BIRTH_DATA.time,
    gender: initialInput?.gender || DEFAULT_BIRTH_DATA.gender,
    province: initialInput?.province ?? "",
    city: initialInput?.city ?? "",
  };
}

function singleCity(province: string): string {
  const cities = Object.keys(CITIES[province] ?? {});
  return cities.length === 1 ? cities[0] ?? "" : "";
}

export function BirthDataForm({
  initialInput,
  onSubmit,
}: BirthDataFormProps) {
  const [draft, setDraft] = useState<BirthDataInput>(() =>
    initialDraft(initialInput),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dateOpen, setDateOpen] = useState(false);
  const selectedDate = localDate(draft.date);

  function clearErrors(...fields: Array<keyof BirthDataInput>) {
    setErrors((current) => {
      if (!fields.some((field) => current[field])) return current;
      const next = { ...current };
      for (const field of fields) {
        delete next[field];
      }
      return next;
    });
  }

  function changeField(
    field: "date" | "time" | "gender",
    value: string,
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    clearErrors(field);
  }

  function changeProvince(province: string) {
    setDraft((current) => ({
      ...current,
      province,
      city: singleCity(province),
    }));
    clearErrors("province", "city");
  }

  function changeCity(city: string) {
    setDraft((current) => ({ ...current, city }));
    clearErrors("province", "city");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const snapshot: BirthDataInput = {
      ...draft,
      province: draft.province ?? "",
      city: draft.city ?? "",
    };
    const parsed = parse(snapshot);
    if (!parsed.ok) {
      setErrors(parsed.fields);
      return;
    }
    setErrors({});
    onSubmit({ profile: parsed.value, snapshot });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="date-trigger" className="text-muted-foreground">
          出生日期
        </Label>
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
                ? selectedDate.toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "选择出生日期"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                changeField("date", date ? dateString(date) : "");
                setDateOpen(false);
              }}
              captionLayout="dropdown"
              startMonth={new Date(1801, 0)}
              endMonth={
                new Date(BIRTH_DATE_LIMIT.year, BIRTH_DATE_LIMIT.month - 1)
              }
              locale={zhCN}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-xs text-destructive">{errors.date}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="time" className="text-muted-foreground">
          出生时间
        </Label>
        <Input
          id="time"
          type="time"
          value={draft.time}
          onChange={(event) => changeField("time", event.target.value)}
          className={cn(
            "[&::-webkit-calendar-picker-indicator]:appearance-none",
            errors.time && "border-destructive",
          )}
        />
        {errors.time && (
          <p className="text-xs text-destructive">{errors.time}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label className="text-muted-foreground">性别</Label>
        <RadioGroup
          value={draft.gender}
          onValueChange={(gender) => changeField("gender", gender)}
          className="flex flex-row gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="男" id="gender-male" />
            <Label
              htmlFor="gender-male"
              className="cursor-pointer font-normal"
            >
              男
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="女" id="gender-female" />
            <Label
              htmlFor="gender-female"
              className="cursor-pointer font-normal"
            >
              女
            </Label>
          </div>
        </RadioGroup>
        {errors.gender && (
          <p className="text-xs text-destructive">{errors.gender}</p>
        )}
      </div>

      <BirthplaceSelect
        province={draft.province ?? ""}
        city={draft.city ?? ""}
        errors={errors}
        onProvinceChange={changeProvince}
        onCityChange={changeCity}
      />

      <Button type="submit" className="w-full">
        排盘
      </Button>
    </form>
  );
}
