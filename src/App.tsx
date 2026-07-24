// 排盘应用：单路由单页 App → FormPanel + ResultPanel。
// App 读写 URL 参数（useSearchParams），URL 只恢复表单默认值，不自动排盘。
// 提交成功后 App 通过 setSearchParams 更新 URL（单一写入点）。
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { PaipanData } from "@/api/paipan";
import { fromUrlParams, toUrlParams } from "@/birth-profile";
import {
  NEAR_ZI_ZHENG,
  NO_LONGITUDE_CORRECTION,
  TRUE_SOLAR_TIME,
} from "@/mingpan";
import { FormPanel, type BirthData } from "@/components/FormPanel";
import { PersonalInfo } from "@/components/PersonalInfo";
import { SizhuTable } from "@/components/SizhuTable";
import { GanzhiRelations } from "@/components/GanzhiRelations";
import { DayunPanel } from "@/components/DayunPanel";

// 提示文案映射：判定（code）在命盘模块，文案措辞在 UI 层。
const tipMessages: Record<string, string> = {
  [NEAR_ZI_ZHENG]: "出生时刻近子正（00:00），已按早晚子时归属日柱与时柱；若实际时刻略有出入，排盘结果可能不同。",
  [NO_LONGITUDE_CORRECTION]: "未做经度修正，真太阳时可能偏移。给出出生省市可按出生地经度修正为真太阳时。",
  [TRUE_SOLAR_TIME]: "已按出生地经度修正与均时差合成为真太阳时排盘。",
};

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [paipanData, setPaipanData] = useState<PaipanData | null>(null);

  const defaultValues = fromUrlParams(searchParams) as Partial<BirthData>;

  function handleSubmit(data: PaipanData) {
    setPaipanData(data);
    setSearchParams(toUrlParams(data.input), { replace: true });
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
                  {paipanData.tips.map((code) => (
                    <li key={code} className="text-sm text-muted-foreground">{tipMessages[code]}</li>
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
