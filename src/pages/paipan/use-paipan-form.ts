// 排盘表单逻辑 hook：表单状态 + 校验 + 提交 → 命盘数据。
// 词汇遵循 CONTEXT.md（出生资料、命盘、排盘）。
import { useState } from "react";
import { parse, type BirthDataInput } from "@/domain/birth/birth-profile";
import { getBirthDateLimit, parseBirthDate } from "@/domain/birth/birth-date";
import { mingpan, type Mingpan } from "@/domain/paipan/mingpan";
import { getCurrentBeijingDateTime } from "@/utils/beijing-time";

export interface PaipanFormState {
  date: string;
  time: string;
  gender: string;
  province: string;
  city: string;
}

export interface PaipanFormResult {
  values: PaipanFormState;
  errors: Record<string, string>;
  generalError: string;
  submitting: boolean;
  result: Mingpan | null;
  submittedInput: BirthDataInput | null;
  dateLimit: { year: number; month: number; day: number };
  handleDateChange: (date: Date | undefined) => void;
  handleTimeChange: (time: string) => void;
  handleGenderChange: (gender: string) => void;
  handleBirthplaceChange: (province: string, city: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  selectedDate: Date | undefined;
  dateOpen: boolean;
  setDateOpen: (open: boolean) => void;
}

function formatDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 表单层出生日期默认值；非命理概念（见 CONTEXT.md「出生资料」），与 time/gender 默认同属 UI 预填。 */
export const DEFAULT_BIRTH_DATE = "2000-01-01";

// 解析表单初始出生日期：URL 合法 date 优先；无 URL 或 URL 非法时预填默认 2000-01-01。
// 复用领域层 parseBirthDate 做格式与真实日历校验；领域层对空 date 仍报错，默认不渗入 domain。
// 将 YYYY-MM-DD 解析为本地零点的 Date，统一 date↔string 的本地午夜口径（与 formatDateString 互逆）。
function parseLocalMidnight(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

export function resolveInitialBirthDate(date?: string): Date {
  const candidate = date ?? DEFAULT_BIRTH_DATE;
  if (parseBirthDate(candidate) !== null) {
    return parseLocalMidnight(candidate);
  }
  return parseLocalMidnight(DEFAULT_BIRTH_DATE);
}

export function usePaipanForm(defaultValues?: Partial<BirthDataInput>): PaipanFormResult {
  const dateLimit = getBirthDateLimit();

  const initialDate = resolveInitialBirthDate(defaultValues?.date);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [time, setTime] = useState(defaultValues?.time ?? "00:00");
  const [gender, setGender] = useState(defaultValues?.gender ?? "男");
  const [province, setProvince] = useState(defaultValues?.province ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Mingpan | null>(null);
  const [submittedInput, setSubmittedInput] = useState<BirthDataInput | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGeneralError("");

    const dateString = selectedDate ? formatDateString(selectedDate) : "";

    const strings: BirthDataInput = { date: dateString, time, gender, province, city };
    const parsed = parse(strings);
    if (!parsed.ok) {
      setErrors(parsed.fields);
      setGeneralError(Object.values(parsed.fields)[0] ?? "");
      return;
    }

    setSubmitting(true);
    try {
      const currentTime = getCurrentBeijingDateTime();
      const mingpanResult = mingpan(parsed.value, currentTime);
      setSubmittedInput(strings);
      setResult(mingpanResult);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDateChange(date: Date | undefined) {
    setSelectedDate(date);
    setDateOpen(false);
    if (errors.date) setErrors((p) => ({ ...p, date: "" }));
  }

  function handleTimeChange(value: string) {
    setTime(value);
    if (errors.time) setErrors((p) => ({ ...p, time: "" }));
  }

  function handleGenderChange(value: string) {
    setGender(value);
    if (errors.gender) setErrors((p) => ({ ...p, gender: "" }));
  }

  function handleBirthplaceChange(p: string, c: string) {
    setProvince(p);
    setCity(c);
  }

  return {
    values: {
      date: selectedDate ? formatDateString(selectedDate) : "",
      time,
      gender,
      province,
      city,
    },
    errors,
    generalError,
    submitting,
    result,
    submittedInput,
    dateLimit,
    handleDateChange,
    handleTimeChange,
    handleGenderChange,
    handleBirthplaceChange,
    handleSubmit,
    selectedDate,
    dateOpen,
    setDateOpen,
  };
}
