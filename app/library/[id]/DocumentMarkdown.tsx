'use client';

import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { formatDocumentMarkdown } from './formatDocumentMarkdown';

type DocumentMarkdownProps = {
  content: string;
};

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ ...props }) => <h1 className="mb-6 mt-10 text-3xl font-bold leading-tight text-white md:text-[2.15rem]" {...props} />,
  h2: ({ ...props }) => <h2 className="mb-4 mt-8 text-2xl font-semibold leading-tight text-white md:text-[1.7rem]" {...props} />,
  h3: ({ ...props }) => <h3 className="mb-3 mt-6 text-xl font-semibold leading-snug text-white md:text-[1.35rem]" {...props} />,
  p: ({ ...props }) => <p className="mb-5 text-[0.98rem] leading-7 text-zinc-200 md:text-[1.02rem]" {...props} />,
  ul: ({ ...props }) => <ul className="mb-5 list-outside list-disc space-y-2 pl-6 text-[0.98rem] leading-7 text-zinc-200 md:text-[1.02rem]" {...props} />,
  ol: ({ ...props }) => <ol className="mb-5 list-outside list-decimal space-y-2 pl-6 text-[0.98rem] leading-7 text-zinc-200 md:text-[1.02rem]" {...props} />,
  li: ({ ...props }) => <li className="pl-1" {...props} />,
  a: ({ ...props }) => (
    <a
      className="text-[#d97757] underline underline-offset-2 transition-colors hover:text-[#c66849]"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: ({ inline, ...props }: { inline?: boolean } & React.HTMLAttributes<HTMLElement>) =>
    inline ? (
      <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-[0.92em] text-zinc-100" {...props} />
    ) : (
      <code className="block overflow-x-auto rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100" {...props} />
    ),
  blockquote: ({ ...props }) => <blockquote className="my-6 border-l-2 border-[#d97757] pl-4 text-[0.98rem] italic leading-7 text-zinc-400 md:text-[1.02rem]" {...props} />,
  hr: ({ ...props }) => <hr className="border-zinc-800 my-8" {...props} />,
  table: ({ ...props }) => <div className="my-6 overflow-x-auto"><table className="min-w-full border-collapse text-left text-sm text-zinc-200" {...props} /></div>,
  th: ({ ...props }) => <th className="border-b border-zinc-800 px-3 py-2 font-semibold text-white" {...props} />,
  td: ({ ...props }) => <td className="border-b border-zinc-800 px-3 py-2 align-top" {...props} />,
};

export default function DocumentMarkdown({ content }: DocumentMarkdownProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={MARKDOWN_COMPONENTS}>
      {formatDocumentMarkdown(content)}
    </ReactMarkdown>
  );
}
