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

export function RestrictedMarkdown({ source }: { source: string }) {
  validateChapterMarkdown(source);
  return (
    <ReactMarkdown
      allowedElements={allowedElements}
      components={components}
      remarkPlugins={[remarkGfm]}
      skipHtml
    >
      {source}
    </ReactMarkdown>
  );
}
