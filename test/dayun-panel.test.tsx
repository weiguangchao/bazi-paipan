// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DayunPanel } from "@/components/paipan-result/DayunPanel";
import type {
  DayunOut,
  DayunzhuOut,
  LiunianItemOut,
  LiuyuezhuOut,
} from "@/domain/paipan/mingpan";

function liuyue(index: number): LiuyuezhuOut {
  return {
    ganzhi: "甲子",
    startJie: `节${index + 1}`,
    startMonth: index + 1,
    startDay: 1,
    tianganShishen: "比肩",
    dizhiShishen: "正印",
    isCurrent: false,
  };
}

function liunian(year: number, currentYear?: number): LiunianItemOut {
  return {
    year,
    ganzhi: "甲子",
    tianganShishen: "比肩",
    dizhiShishen: "正印",
    isCurrentYear: year === currentYear,
    liuyue: Array.from({ length: 12 }, (_, index) => liuyue(index)),
  };
}

function dayunzhu(startYear: number, isCurrent: boolean, currentYear?: number): DayunzhuOut {
  return {
    ganzhi: "甲子",
    tianganShishen: "比肩",
    dizhiShishen: "正印",
    qiyun: { ageYears: 1, ageMonths: 0 },
    startYear,
    startMonth: 1,
    isCurrent,
    liunian: Array.from({ length: 10 }, (_, index) =>
      liunian(startYear + index, currentYear),
    ),
  };
}

function dayun({
  currentDayunStartYear,
  currentYear,
}: {
  currentDayunStartYear?: number;
  currentYear?: number;
} = {}): DayunOut {
  return {
    direction: "顺",
    qiyun: { ageYears: 1, ageMonths: 0 },
    zhu: [2000, 2010, 2020].map((startYear) =>
      dayunzhu(startYear, startYear === currentDayunStartYear, currentYear),
    ),
  };
}

function selectedCards(testId: string): HTMLElement[] {
  return screen
    .queryAllByTestId(testId)
    .filter((element) => element.getAttribute("data-state") === "on");
}

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

describe("DayunPanel 自动携带", () => {
  it("自动选择当前大运与其中的今年，并展示未选中的十二个流月", () => {
    render(<DayunPanel data={dayun({ currentDayunStartYear: 2020, currentYear: 2025 })} />);

    expect(selectedCards("dayun-card")).toHaveLength(1);
    expect(selectedCards("dayun-card")[0]).toHaveTextContent("2020");
    expect(selectedCards("liunian-card")).toHaveLength(1);
    expect(selectedCards("liunian-card")[0]).toHaveTextContent("2025");
    expect(screen.getAllByTestId("liuyue-card")).toHaveLength(12);
    expect(selectedCards("liuyue-card")).toHaveLength(0);
  });

  it("十年交界月份当前大运不含今年时只选择当前大运", () => {
    render(<DayunPanel data={dayun({ currentDayunStartYear: 2010, currentYear: 2025 })} />);

    expect(selectedCards("dayun-card")).toHaveLength(1);
    expect(selectedCards("dayun-card")[0]).toHaveTextContent("2010");
    expect(screen.getAllByTestId("liunian-card")).toHaveLength(10);
    expect(selectedCards("liunian-card")).toHaveLength(0);
    expect(screen.queryAllByTestId("liuyue-card")).toHaveLength(0);
  });

  it("没有当前大运时回退第一步大运及其第一个流年", () => {
    render(<DayunPanel data={dayun()} />);

    expect(selectedCards("dayun-card")).toHaveLength(1);
    expect(selectedCards("dayun-card")[0]).toHaveTextContent("2000");
    expect(selectedCards("liunian-card")).toHaveLength(1);
    expect(selectedCards("liunian-card")[0]).toHaveTextContent("2000");
    expect(screen.getAllByTestId("liuyue-card")).toHaveLength(12);
    expect(selectedCards("liuyue-card")).toHaveLength(0);
  });
});

describe("DayunPanel 手动切换与重置", () => {
  it("朱签标记真实当前项，并与手动选择态保持独立", async () => {
    const user = userEvent.setup();
    const data = dayun({ currentDayunStartYear: 2020, currentYear: 2025 });
    data.zhu[2]!.liunian[5]!.liuyue[3]!.isCurrent = true;
    render(<DayunPanel data={data} />);

    const currentDayunMarker = screen.getByText("当前", { exact: true });
    const currentYearMarker = screen.getByText("今年", { exact: true });
    const currentLiuyueMarker = screen.getByText("本月", { exact: true });
    expect(currentDayunMarker).toHaveAttribute("data-current-marker", "seal");
    expect(currentYearMarker).toHaveAttribute("data-current-marker", "seal");
    expect(currentLiuyueMarker).toHaveAttribute("data-current-marker", "seal");

    const currentDayunCard = currentDayunMarker.closest('[data-testid="dayun-card"]');
    expect(currentDayunCard).toHaveAttribute("data-state", "on");
    await user.click(screen.getAllByTestId("dayun-card")[0]!);
    expect(currentDayunCard).toHaveAttribute("data-state", "off");
    expect(currentDayunMarker).toBeVisible();
  });

  it("切换大运按目标状态选择默认流年，切换流年清空流月，重复点击不折叠", async () => {
    const user = userEvent.setup();
    render(<DayunPanel data={dayun({ currentDayunStartYear: 2020, currentYear: 2025 })} />);

    const currentDayun = screen.getAllByTestId("dayun-card")[2]!;
    const firstDayun = screen.getAllByTestId("dayun-card")[0]!;
    await user.click(firstDayun);
    expect(selectedCards("liunian-card")[0]).toHaveTextContent("2000");

    await user.click(screen.getAllByTestId("liuyue-card")[2]!);
    expect(selectedCards("liuyue-card")).toHaveLength(1);

    const liuyueLayer = screen.getByRole("radiogroup", { name: "流月" });
    liuyueLayer.scrollLeft = 80;
    await user.click(screen.getAllByTestId("liunian-card")[1]!);
    expect(screen.getAllByTestId("liuyue-card")).toHaveLength(12);
    expect(selectedCards("liuyue-card")).toHaveLength(0);
    expect(liuyueLayer.scrollLeft).toBe(0);

    await user.click(screen.getAllByTestId("liunian-card")[1]!);
    expect(selectedCards("liunian-card")).toHaveLength(1);
    expect(screen.getAllByTestId("liuyue-card")).toHaveLength(12);

    await user.click(currentDayun);
    expect(selectedCards("liunian-card")[0]).toHaveTextContent("2025");
    await user.click(currentDayun);
    expect(selectedCards("dayun-card")).toHaveLength(1);
    expect(selectedCards("liunian-card")[0]).toHaveTextContent("2025");
  });

  it("重新排盘时丢弃旧点击态并按新命盘重新自动携带", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DayunPanel data={dayun({ currentDayunStartYear: 2020, currentYear: 2025 })} />,
    );

    await user.click(screen.getAllByTestId("dayun-card")[0]!);
    await user.click(screen.getAllByTestId("liunian-card")[4]!);
    await user.click(screen.getAllByTestId("liuyue-card")[3]!);

    rerender(<DayunPanel data={dayun({ currentDayunStartYear: 2010, currentYear: 2015 })} />);

    expect(selectedCards("dayun-card")[0]).toHaveTextContent("2010");
    expect(selectedCards("liunian-card")[0]).toHaveTextContent("2015");
    expect(selectedCards("liuyue-card")).toHaveLength(0);
  });
});
