// 排盘表单逻辑 hook：表单状态 + 校验 + 提交 → 命盘数据。
// 词汇遵循 CONTEXT.md（出生资料、命盘、排盘）。
import { useState } from "react";
import { parse, type BirthDataInput } from "@/domain/birth/birth-profile";
import { getBirthDateLimit } from "@/domain/birth/birth-date";
import { mingpan, type Mingpan } from "@/domain/paipan/mingpan";
import { getBeijingYearMonth } from "@/utils/beijing-time";

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

export function usePaipanForm(defaultValues?: Partial<BirthDataInput>): PaipanFormResult {
  const now = getBeijingYearMonth();
  const dateLimit = getBirthDateLimit(now);

  const initialDate = defaultValues?.date ? new Date(defaultValues.date + "T00:00:00") : undefined;
  const validInitial = initialDate && !isNaN(initialDate.getTime()) ? initialDate : undefined;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(validInitial);
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
    const parsed = parse(strings, now);
    if (!parsed.ok) {
      setErrors(parsed.fields);
      setGeneralError(Object.values(parsed.fields)[0] ?? "");
      return;
    }

    setSubmitting(true);
    try {
      const mingpanResult = mingpan(parsed.value, now);
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
