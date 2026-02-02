'use client';

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

type CodeCopyState = {
  copiedKey: string | null;
};

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

  const md = useMemo(() => {
    return normalizeMarkdownForDisplay(props.content);
  }, [props.content]);

  const components = useMemo(() => {
    return {
      a: ({ href, children }: any) => {
        const safeHref = typeof href === 'string' ? href : '';

        return (
          <a
            href={safeHref}
            target="_blank"
            rel="noreferrer"
            className="text-[#c66849] underline decoration-[#c66849]/40 underline-offset-2 hover:decoration-[#c66849]"
          >
            {children}
          </a>
        );
      },
      p: ({ children }: any) => {
        return <p className="my-3 whitespace-pre-wrap">{children}</p>;
      },
      ul: ({ children }: any) => {
        return <ul className="my-3 list-disc pl-6">{children}</ul>;
      },
      ol: ({ children }: any) => {
        return <ol className="my-3 list-decimal pl-6">{children}</ol>;
      },
      li: ({ children }: any) => {
        return <li className="my-1">{children}</li>;
      },
      h1: ({ children }: any) => {
        return <h1 className="mt-5 mb-2 text-xl font-semibold">{children}</h1>;
      },
      h2: ({ children }: any) => {
        return <h2 className="mt-5 mb-2 text-lg font-semibold">{children}</h2>;
      },
      h3: ({ children }: any) => {
        return <h3 className="mt-4 mb-2 text-base font-semibold">{children}</h3>;
      },
      blockquote: ({ children }: any) => {
        return (
          <blockquote className="my-3 border-l-2 border-stone-200 pl-4 text-stone-700">
            {children}
          </blockquote>
        );
      },
      code: ({ inline, className, children }: any) => {
        const text = String(children ?? '');

        if (inline || isProbablyInlineCode(className)) {
          return (
            <code
              className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.9em] text-stone-900 [&::selection]:bg-[#d97757]/30 [&::selection]:text-stone-900"
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
          <div className="my-4 overflow-hidden rounded-lg border border-stone-200 bg-white [&_*::selection]:bg-[#d97757]/30 [&_*::selection]:text-stone-900">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2">
              <div className="text-xs font-semibold text-stone-600">{lang}</div>
              <button
                type="button"
                className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
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
              <code className="font-mono text-stone-900" style={{ userSelect: 'text' }}>{text}</code>
            </pre>
          </div>
        );
      },
      table: ({ children }: any) => {
        return (
          <div className="my-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">{children}</table>
          </div>
        );
      },
      thead: ({ children }: any) => {
        return <thead className="bg-stone-50">{children}</thead>;
      },
      tbody: ({ children }: any) => {
        return <tbody className="bg-white">{children}</tbody>;
      },
      tr: ({ children }: any) => {
        return <tr className="border-b border-stone-200">{children}</tr>;
      },
      th: ({ children }: any) => {
        return <th className="px-3 py-2 text-left text-xs font-semibold text-stone-700">{children}</th>;
      },
      td: ({ children }: any) => {
        return <td className="px-3 py-2 align-top text-stone-800">{children}</td>;
      },
    };
  }, [copyState.copiedKey]);

  return (
    <div
      className="text-stone-800 [&_*::selection]:bg-[#d97757]/30 [&_*::selection]:text-stone-900"
      style={{ userSelect: 'text', cursor: 'text' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components as any}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
