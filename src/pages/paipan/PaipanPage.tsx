// 排盘页面：单页布局 → BirthDataForm + 命盘结果。
// 页面只组合初始 URL 草稿、成功 submission、当前时刻、命盘与命盘链接。
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { mingpan, type Mingpan } from "@/domain/paipan/mingpan";
import {
  initialInputFromUrlParams,
  toUrlParams,
} from "@/pages/paipan/url-params";
import {
  BirthDataForm,
  type BirthDataSubmission,
} from "@/components/paipan-form/BirthDataForm";
import { PersonalInfo } from "@/components/paipan-result/PersonalInfo";
import { SizhuTable } from "@/components/paipan-result/SizhuTable";
import { GanzhiRelations } from "@/components/paipan-result/GanzhiRelations";
import { DayunPanel } from "@/components/paipan-result/DayunPanel";
import { getCurrentBeijingDateTime } from "@/utils/beijing-time";

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
  const [initialInput] = useState(() =>
    initialInputFromUrlParams(searchParams),
  );
  const [result, setResult] = useState<Mingpan | null>(null);

  function submitBirthData(submission: BirthDataSubmission) {
    const currentTime = getCurrentBeijingDateTime();
    const nextResult = mingpan(submission.profile, currentTime);
    setResult(nextResult);
    setSearchParams(toUrlParams(submission.snapshot), { replace: true });
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-6 p-6 max-md:flex-col max-md:p-3">
      <aside className="flex-none max-md:w-full md:w-80">
        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="mb-5 text-xl font-semibold text-accent">命盘工作台</h1>
          <BirthDataForm
            initialInput={initialInput}
            onSubmit={submitBirthData}
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
