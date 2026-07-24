// 排盘应用：单路由单页 App → FormPanel + ResultPanel。
// App 读写 URL 参数（useSearchParams），URL 只恢复表单默认值，不自动排盘。
// 提交成功后 App 通过 setSearchParams 更新 URL（单一写入点）。
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { PaipanData } from "@/api/paipan";
import { FormPanel, type BirthData } from "@/components/FormPanel";
import { PersonalInfo } from "@/components/PersonalInfo";
import { SizhuTable } from "@/components/SizhuTable";
import { GanzhiRelations } from "@/components/GanzhiRelations";
import { DayunPanel } from "@/components/DayunPanel";

function readDefaultValues(params: URLSearchParams): Partial<BirthData> {
  const date = params.get("date");
  const time = params.get("time");
  const gender = params.get("gender");
  const province = params.get("province");
  const city = params.get("city");

  return {
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    time: time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : undefined,
    gender: gender === "男" || gender === "女" ? gender : undefined,
    province: province || undefined,
    city: city || undefined,
  };
}

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [paipanData, setPaipanData] = useState<PaipanData | null>(null);

  const defaultValues = readDefaultValues(searchParams);

  function handleSubmit(data: PaipanData) {
    setPaipanData(data);
    const params = new URLSearchParams();
    params.set("date", data.input.date);
    params.set("time", data.input.time);
    params.set("gender", data.input.gender);
    if (data.input.province && data.input.city) {
      params.set("province", data.input.province);
      params.set("city", data.input.city);
    }
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-6 p-6 max-md:flex-col max-md:p-3">
      <aside className="flex-none max-md:w-full md:w-80">
        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="mb-5 text-xl font-semibold text-accent">命盘工作台</h1>
          <FormPanel defaultValues={defaultValues} onSubmit={handleSubmit} />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {paipanData ? (
          <div className="grid gap-4">
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-accent">个人</h2>
              <PersonalInfo data={paipanData.personal} />
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-accent">四柱</h2>
              <SizhuTable sizhu={paipanData.sizhu} />
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-accent">干支留意</h2>
              <GanzhiRelations data={paipanData.ganzhiRelations} />
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-accent">大运</h2>
              <DayunPanel data={paipanData.dayun} />
            </section>

            {paipanData.tips.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-4 text-lg font-semibold text-accent">提示</h2>
                <ul className="grid gap-2">
                  {paipanData.tips.map((tip) => (
                    <li key={tip.code} className="text-sm text-muted-foreground">{tip.message}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-24 text-center">
            <p className="text-muted-foreground">填写出生资料后点击「排盘」查看命盘</p>
          </div>
        )}
      </main>
    </div>
  );
}
