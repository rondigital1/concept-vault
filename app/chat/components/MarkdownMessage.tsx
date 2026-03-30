'use client';

import { useMemo, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

type CodeCopyState = {
  copiedKey: string | null;
};

type MarkdownChildrenProps = {
  children?: ReactNode;
};

type AnchorProps = ComponentPropsWithoutRef<'a'> & MarkdownChildrenProps;
type CodeProps = ComponentPropsWithoutRef<'code'> &
  MarkdownChildrenProps & {
    inline?: boolean;
  };
type TableCellProps = ComponentPropsWithoutRef<'td'> & MarkdownChildrenProps;
type TableHeaderCellProps = ComponentPropsWithoutRef<'th'> & MarkdownChildrenProps;
type TableRowProps = ComponentPropsWithoutRef<'tr'> & MarkdownChildrenProps;
type TableSectionProps = ComponentPropsWithoutRef<'thead'> &
  ComponentPropsWithoutRef<'tbody'> &
  MarkdownChildrenProps;
type TableProps = ComponentPropsWithoutRef<'table'> & MarkdownChildrenProps;

function isProbablyInlineCode(className?: string) {
  if (!className) {
    return false;
  }

  return !className.includes('language-');
}

function extractLanguage(className?: string) {
  if (!className) {
    return null;
  }

  const match = className.match(/language-([a-z0-9-]+)/i);

  if (!match) {
    return null;
  }

  return match[1];
}

function normalizeMarkdownForDisplay(raw: string | undefined | null) {
  if (!raw) return '';
  let text = raw;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\u00A0/g, ' ');
  text = text.trim();
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}

export function MarkdownMessage(props: { content: string }) {
  const [copyState, setCopyState] = useState<CodeCopyState>({ copiedKey: null });

  const md = useMemo(() => normalizeMarkdownForDisplay(props.content), [props.content]);

  const components = useMemo<Components>(() => {
    return {
      a: ({ href, children }: AnchorProps) => {
        const safeHref = typeof href === 'string' ? href : '';

        return (
          <a
            href={safeHref}
            target="_blank"
            rel="noreferrer"
            className="text-[#e39a7d] underline decoration-[#b87a60] underline-offset-2 hover:decoration-[#e39a7d]"
          >
            {children}
          </a>
        );
      },
      p: ({ children }: MarkdownChildrenProps) => <p className="my-3 whitespace-pre-wrap">{children}</p>,
      ul: ({ children }: MarkdownChildrenProps) => <ul className="my-3 list-disc pl-6">{children}</ul>,
      ol: ({ children }: MarkdownChildrenProps) => <ol className="my-3 list-decimal pl-6">{children}</ol>,
      li: ({ children }: MarkdownChildrenProps) => <li className="my-1">{children}</li>,
      h1: ({ children }: MarkdownChildrenProps) => <h1 className="mb-2 mt-5 text-xl font-semibold">{children}</h1>,
      h2: ({ children }: MarkdownChildrenProps) => <h2 className="mb-2 mt-5 text-lg font-semibold">{children}</h2>,
      h3: ({ children }: MarkdownChildrenProps) => <h3 className="mb-2 mt-4 text-base font-semibold">{children}</h3>,
      blockquote: ({ children }: MarkdownChildrenProps) => (
        <blockquote className="my-3 border-l-2 border-zinc-700 pl-4 text-zinc-300">
          {children}
        </blockquote>
      ),
      code: ({ inline, className, children }: CodeProps) => {
        const text = String(children ?? '');

        if (inline || isProbablyInlineCode(className)) {
          return (
            <code
              className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[0.9em] text-zinc-100 [&::selection]:bg-[#5a3020] [&::selection]:text-white"
              style={{ userSelect: 'text' }}
            >
              {text}
            </code>
          );
        }

        const lang = extractLanguage(className) ?? 'text';
        const codeKey = `${lang}:${text.length}:${text.slice(0, 24)}`;
        const isCopied = copyState.copiedKey === codeKey;

        return (
          <div className="my-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 [&_*::selection]:bg-[#5a3020] [&_*::selection]:text-white">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {lang}
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(text);
                    setCopyState({ copiedKey: codeKey });

                    window.setTimeout(() => {
                      setCopyState({ copiedKey: null });
                    }, 1200);
                  } catch {
                    // ignore
                  }
                }}
              >
                {isCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="max-w-full overflow-x-auto px-4 py-3 text-sm leading-6" style={{ userSelect: 'text' }}>
              <code className="font-mono text-zinc-100" style={{ userSelect: 'text' }}>
                {text}
              </code>
            </pre>
          </div>
        );
      },
      table: ({ children }: TableProps) => (
        <div className="my-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">{children}</table>
        </div>
      ),
      thead: ({ children }: TableSectionProps) => <thead className="bg-zinc-950">{children}</thead>,
      tbody: ({ children }: TableSectionProps) => <tbody className="bg-transparent">{children}</tbody>,
      tr: ({ children }: TableRowProps) => <tr className="border-b border-zinc-800">{children}</tr>,
      th: ({ children }: TableHeaderCellProps) => (
        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400">{children}</th>
      ),
      td: ({ children }: TableCellProps) => <td className="px-3 py-2 align-top text-zinc-200">{children}</td>,
    };
  }, [copyState.copiedKey]);

  return (
    <div
      className="text-zinc-100 [&_*::selection]:bg-[#5a3020] [&_*::selection]:text-white"
      style={{ userSelect: 'text', cursor: 'text' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
