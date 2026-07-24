// 排盘页面：单页布局 → FormPanel + ResultPanel。
// App 读写 URL 参数（useSearchParams），URL 只恢复表单默认值，不自动排盘。
// 提交成功后 App 通过 setSearchParams 更新 URL（单一写入点）。
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { Mingpan } from "@/domain/paipan/mingpan";
import { fromUrlParams, toUrlParams } from "@/pages/paipan/url-params";
import { usePaipanForm } from "@/pages/paipan/use-paipan-form";
import { FormPanel } from "@/components/paipan-form/FormPanel";
import { PersonalInfo } from "@/components/paipan-result/PersonalInfo";
import { SizhuTable } from "@/components/paipan-result/SizhuTable";
import { GanzhiRelations } from "@/components/paipan-result/GanzhiRelations";
import { DayunPanel } from "@/components/paipan-result/DayunPanel";

function ResultContent({ data }: { data: Mingpan }) {
  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold text-accent">个人</h2>
        <PersonalInfo data={data.personal} />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold text-accent">四柱</h2>
        <SizhuTable sizhu={data.sizhu} />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold text-accent">干支留意</h2>
        <GanzhiRelations data={data.ganzhiRelations} />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold text-accent">大运</h2>
        <DayunPanel data={data.dayun} />
      </section>
    </div>
  );
}

export function PaipanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultValues = fromUrlParams(searchParams);
  const form = usePaipanForm(defaultValues);

  // Sync result to URL after successful submission
  const result = form.result;
  const submittedInput = form.submittedInput;
  useEffect(() => {
    if (result && submittedInput) {
      setSearchParams(toUrlParams(submittedInput), { replace: true });
    }
  }, [result, submittedInput, setSearchParams]);

  return (
    <div className="mx-auto flex max-w-6xl gap-6 p-6 max-md:flex-col max-md:p-3">
      <aside className="flex-none max-md:w-full md:w-80">
        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="mb-5 text-xl font-semibold text-accent">命盘工作台</h1>
          <FormPanel
            values={form.values}
            errors={form.errors}
            generalError={form.generalError}
            submitting={form.submitting}
            selectedDate={form.selectedDate}
            dateOpen={form.dateOpen}
            dateLimit={form.dateLimit}
            onSubmit={form.handleSubmit}
            onDateChange={form.handleDateChange}
            onTimeChange={form.handleTimeChange}
            onGenderChange={form.handleGenderChange}
            onBirthplaceChange={form.handleBirthplaceChange}
            onDateOpenChange={form.setDateOpen}
          />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {result ? (
          <ResultContent data={result} />
        ) : (
          <div className="flex items-center justify-center py-24 text-center">
            <p className="text-muted-foreground">填写出生资料后点击「排盘」查看命盘</p>
          </div>
        )}
      </main>
    </div>
  );
}
