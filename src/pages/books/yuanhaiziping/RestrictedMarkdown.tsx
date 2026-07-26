import { Component, type ErrorInfo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const allowedElements = [
  "p",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "blockquote",
  "ol",
  "ul",
  "li",
  "hr",
  "code",
  "pre",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "br",
];

export function validateChapterMarkdown(source: string): void {
  if (/<[A-Za-z!/][^>]*>/.test(source)) {
    throw new Error("本篇包含禁止的原始 HTML");
  }
  if (/!\[[^\]]*]\([^)]*\)/.test(source)) {
    throw new Error("本篇包含禁止的图片或嵌入内容");
  }
  if (/]\(\s*(?:javascript|data|vbscript):/i.test(source)) {
    throw new Error("本篇包含危险链接");
  }
  if (source.includes("\uFFFD") || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(source)) {
    throw new Error("本篇包含不可识别字符");
  }
}

const components: Components = {
  table({ children, ...props }) {
    return (
      <div className="chapter-table-wrap" tabIndex={0}>
        <table {...props}>{children}</table>
      </div>
    );
  },
  a({ children, href, ...props }) {
    const external = href?.startsWith("http://") || href?.startsWith("https://");
    return (
      <a
        {...props}
        href={href}
        rel={external ? "noreferrer" : undefined}
        target={external ? "_blank" : undefined}
      >
        {children}
      </a>
    );
  },
};

function MarkdownSafetyError({ message }: { message: string }) {
  return (
    <div className="reader-error" role="alert">
      <strong>本篇内容无法安全渲染</strong>
      <p>{message}</p>
    </div>
  );
}

export class MarkdownErrorBoundary extends Component<
  { children: ReactNode },
  { message?: string }
> {
  override state: { message?: string } = {};

  static getDerivedStateFromError(error: unknown) {
    return {
      message: error instanceof Error ? error.message : "Markdown 解析失败",
    };
  }

  override componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // The safe fallback keeps the reader navigation usable.
  }

  override render() {
    if (this.state.message) return <MarkdownSafetyError message={this.state.message} />;
    return this.props.children;
  }
}

export function RestrictedMarkdown({ source }: { source: string }) {
  try {
    validateChapterMarkdown(source);
  } catch (error) {
    return (
      <MarkdownSafetyError
        message={error instanceof Error ? error.message : "Markdown 校验失败"}
      />
    );
  }
  return (
    <MarkdownErrorBoundary key={source}>
      <ReactMarkdown
        allowedElements={allowedElements}
        components={components}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {source}
      </ReactMarkdown>
    </MarkdownErrorBoundary>
  );
}
