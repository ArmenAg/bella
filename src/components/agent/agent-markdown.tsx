"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

function safeHref(href: string | undefined) {
  const value = href?.trim();
  if (!value) return null;

  if (value.startsWith("//")) return null;

  if (
    value.startsWith("#") ||
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../")
  ) {
    return value;
  }

  try {
    const url = new URL(value);
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      return value;
    }
  } catch {
    return null;
  }

  return null;
}

function markdownSource(content: string) {
  return content.replace(/</g, "&lt;");
}

const markdownComponents: Components = {
  a({ children, href }) {
    const safe = safeHref(href);
    if (!safe) return <span>{children}</span>;

    const isExternal = /^https?:\/\//i.test(safe);
    return (
      <a
        className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        href={safe}
        rel={isExternal ? "noreferrer" : undefined}
        target={isExternal ? "_blank" : undefined}
      >
        {children}
      </a>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">
        {children}
      </blockquote>
    );
  },
  code({ children, className }) {
    return (
      <code
        className={cn(
          "rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]",
          className,
        )}
      >
        {children}
      </code>
    );
  },
  h1({ children }) {
    return <h1 className="mb-2 mt-3 text-base font-semibold">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="mb-2 mt-3 text-sm font-semibold">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="mb-1.5 mt-3 text-sm font-semibold">{children}</h3>;
  },
  hr() {
    return <hr className="my-3 border-border" />;
  },
  li({ children }) {
    return <li className="pl-1">{children}</li>;
  },
  ol({ children }) {
    return (
      <ol className="my-2 ml-4 list-decimal space-y-1 marker:text-muted-foreground">
        {children}
      </ol>
    );
  },
  p({ children }) {
    return <p className="my-2 first:mt-0 last:mb-0">{children}</p>;
  },
  pre({ children }) {
    return (
      <pre className="my-2 overflow-x-auto rounded-md bg-muted/60 p-3 text-xs leading-5">
        {children}
      </pre>
    );
  },
  strong({ children }) {
    return (
      <strong className="font-semibold text-foreground">{children}</strong>
    );
  },
  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          {children}
        </table>
      </div>
    );
  },
  td({ children }) {
    return <td className="border border-border px-2 py-1.5">{children}</td>;
  },
  th({ children }) {
    return (
      <th className="border border-border bg-muted/50 px-2 py-1.5 font-semibold">
        {children}
      </th>
    );
  },
  ul({ children }) {
    return (
      <ul className="my-2 ml-4 list-disc space-y-1 marker:text-muted-foreground">
        {children}
      </ul>
    );
  },
};

export function AgentMarkdown({
  className,
  content,
}: {
  className?: string;
  content: string;
}) {
  return (
    <div className={cn("break-words text-sm leading-6", className)}>
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm, remarkBreaks]}
      >
        {markdownSource(content)}
      </ReactMarkdown>
    </div>
  );
}
