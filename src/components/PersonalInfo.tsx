// 个人信息展示：生肖、星座。纯展示组件，数据由 API 计算。
// 词汇遵循 CONTEXT.md（生肖、星座）。
import type { PersonalInfo as PersonalInfoData } from "@/personal-info";

export function PersonalInfo({ data }: { data: PersonalInfoData }) {
  const items = [
    { label: "生肖", value: data.shengxiao },
    { label: "星座", value: data.zodiacSign },
  ];
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-muted/30">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-4 py-3 text-center last:border-l border-border">
          <span className="mb-1 block text-sm text-muted-foreground">{item.label}</span>
          <span className="block font-serif text-xl font-semibold text-foreground break-words">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
