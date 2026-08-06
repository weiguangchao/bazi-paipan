// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";
import { BirthDataForm } from "@/components/paipan-form/BirthDataForm";
import type { BirthDataInput } from "@/domain/birth/birth-profile";
import { initialInputFromUrlParams } from "@/pages/paipan/url-params";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(cleanup);

afterAll(() => {
  vi.unstubAllGlobals();
});

async function chooseProvince(name: string) {
  await userEvent.click(screen.getByRole("combobox", { name: "出生省" }));
  await userEvent.click(screen.getByRole("option", { name }));
}

async function chooseCity(name: string) {
  await userEvent.click(screen.getByRole("combobox", { name: "出生市" }));
  await userEvent.click(screen.getByRole("option", { name }));
}

describe("BirthDataForm 草稿", () => {
  it("公开初始值 interface 只接收可选 BirthDataInput", () => {
    expectTypeOf<
      Parameters<typeof BirthDataForm>[0]["initialInput"]
    >().toEqualTypeOf<BirthDataInput | undefined>();
  });

  it("未提供初始草稿时展示既有默认出生资料", () => {
    render(<BirthDataForm onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "出生日期" })).toHaveTextContent(
      "2000年1月1日",
    );
    expect(screen.getByLabelText("出生时间")).toHaveValue("00:00");
    expect(screen.getByRole("radio", { name: "男" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "出生省" })).toHaveTextContent(
      "不选（按北京时间）",
    );
    expect(screen.getByRole("combobox", { name: "出生市" })).toBeDisabled();
  });

  it("空 URL 解码草稿不会用 undefined 覆盖默认值", async () => {
    const onSubmit = vi.fn();
    render(
      <BirthDataForm
        initialInput={initialInputFromUrlParams(new URLSearchParams())}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("出生时间")).toHaveValue("00:00");
    expect(screen.getByRole("radio", { name: "男" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "排盘" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("合法提交一次产出 typed BirthProfile 与原始 snapshot", async () => {
    const onSubmit = vi.fn();
    render(<BirthDataForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "排盘" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({
      profile: {
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        gender: "男",
        birthplace: undefined,
      },
      snapshot: {
        date: "2000-01-01",
        time: "00:00",
        gender: "男",
        province: "",
        city: "",
      },
    });
  });

  it("恢复 URL 草稿但不自动携带唯一城市，也不自动提交", async () => {
    const onSubmit = vi.fn();
    render(
      <BirthDataForm
        initialInput={initialInputFromUrlParams(
          new URLSearchParams({
            date: "1985-03-15",
            time: "08:30",
            gender: "女",
            province: "北京市",
          }),
        )}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("button", { name: "出生日期" })).toHaveTextContent(
      "1985年3月15日",
    );
    expect(screen.getByLabelText("出生时间")).toHaveValue("08:30");
    expect(screen.getByRole("radio", { name: "女" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "出生省" })).toHaveTextContent(
      "北京市",
    );
    expect(screen.getByRole("combobox", { name: "出生市" })).toHaveTextContent(
      "选择城市",
    );
    await userEvent.click(screen.getByRole("button", { name: "排盘" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("用户主动选择唯一城市省份时自动携带城市", async () => {
    render(<BirthDataForm onSubmit={vi.fn()} />);

    await chooseProvince("北京市");

    expect(screen.getByRole("combobox", { name: "出生省" })).toHaveTextContent(
      "北京市",
    );
    expect(screen.getByRole("combobox", { name: "出生市" })).toHaveTextContent(
      "市辖区",
    );
  });

  it("用户切换到多城市省份时清除旧城市", async () => {
    render(
      <BirthDataForm
        initialInput={{
          date: "2000-01-01",
          time: "00:00",
          gender: "男",
          province: "北京市",
          city: "市辖区",
        }}
        onSubmit={vi.fn()}
      />,
    );

    await chooseProvince("重庆市");

    expect(screen.getByRole("combobox", { name: "出生省" })).toHaveTextContent(
      "重庆市",
    );
    expect(screen.getByRole("combobox", { name: "出生市" })).toHaveTextContent(
      "选择城市",
    );
  });

  it("多城市省份在用户明确选择城市前显示成对字段错误", async () => {
    const onSubmit = vi.fn();
    render(<BirthDataForm onSubmit={onSubmit} />);

    await chooseProvince("四川省");
    await userEvent.click(screen.getByRole("button", { name: "排盘" }));

    expect(
      screen.getAllByText("省份与城市须同时给出或同时清空"),
    ).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();

    await chooseCity("成都市");

    expect(
      screen.queryByText("省份与城市须同时给出或同时清空"),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "排盘" }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]?.[0].profile.birthplace).toEqual({
      province: "四川省",
      city: "成都市",
    });
  });

  it("用户清空省份时同时清空并禁用城市", async () => {
    render(
      <BirthDataForm
        initialInput={{
          date: "2000-01-01",
          time: "00:00",
          gender: "男",
          province: "北京市",
          city: "市辖区",
        }}
        onSubmit={vi.fn()}
      />,
    );

    await chooseProvince("不选（按北京时间）");

    expect(screen.getByRole("combobox", { name: "出生省" })).toHaveTextContent(
      "不选（按北京时间）",
    );
    expect(screen.getByRole("combobox", { name: "出生市" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "出生市" })).toHaveTextContent(
      "请先选择省份",
    );
  });

  it("非法提交只显示对应字段错误且不调用成功 callback", async () => {
    const onSubmit = vi.fn();
    render(<BirthDataForm onSubmit={onSubmit} />);

    await userEvent.clear(screen.getByLabelText("出生时间"));
    await userEvent.click(screen.getByRole("button", { name: "排盘" }));

    expect(
      screen.getAllByText("出生时间须为有效 HH:mm"),
    ).toHaveLength(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("后续编辑不会改变已经发出的 submission snapshot", async () => {
    const onSubmit = vi.fn();
    render(<BirthDataForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "排盘" }));
    const submission = onSubmit.mock.calls[0]?.[0];

    await userEvent.clear(screen.getByLabelText("出生时间"));
    await userEvent.type(screen.getByLabelText("出生时间"), "12:34");

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(submission.snapshot).toEqual({
      date: "2000-01-01",
      time: "00:00",
      gender: "男",
      province: "",
      city: "",
    });
  });
});
