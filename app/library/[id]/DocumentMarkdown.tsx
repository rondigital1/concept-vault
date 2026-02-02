'use client';

import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

type DocumentMarkdownProps = {
  content: string;
};

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ ...props }) => <h1 className="text-4xl font-bold text-white mb-6 mt-8" {...props} />,
  h2: ({ ...props }) => <h2 className="text-3xl font-bold text-white mb-4 mt-6" {...props} />,
  h3: ({ ...props }) => <h3 className="text-2xl font-semibold text-white mb-3 mt-5" {...props} />,
  p: ({ ...props }) => <p className="text-zinc-300 leading-relaxed mb-4" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc list-inside text-zinc-300 mb-4 space-y-2" {...props} />,
  ol: ({ ...props }) => <ol className="list-decimal list-inside text-zinc-300 mb-4 space-y-2" {...props} />,
  li: ({ ...props }) => <li className="text-zinc-300" {...props} />,
  a: ({ ...props }) => (
    <a
      className="text-[#d97757] hover:text-[#c66849] underline transition-colors"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: ({ inline, ...props }: { inline?: boolean } & React.HTMLAttributes<HTMLElement>) =>
    inline ? (
      <code className="px-1.5 py-0.5 bg-white/10 text-zinc-200 rounded text-sm font-mono" {...props} />
    ) : (
      <code className="block px-4 py-3 bg-white/5 text-zinc-200 rounded-lg text-sm font-mono overflow-x-auto" {...props} />
    ),
  blockquote: ({ ...props }) => <blockquote className="border-l-4 border-[#d97757] pl-4 italic text-zinc-400 my-4" {...props} />,
  hr: ({ ...props }) => <hr className="border-white/10 my-8" {...props} />,
};

export default function DocumentMarkdown({ content }: DocumentMarkdownProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={MARKDOWN_COMPONENTS}>
      {content}
    </ReactMarkdown>
  );
}
