import dynamic from 'next/dynamic';
import { LibraryPanel } from '@/app/library/components/LibraryPrimitives';

const DocumentMarkdown = dynamic(() => import('./DocumentMarkdown'), {
  loading: () => <div className="h-4 animate-pulse rounded bg-[#232323]" />,
});

export function DocumentBodyPanel({ content }: { content: string }) {
  return (
    <LibraryPanel className="overflow-hidden">
      <div className="border-b border-white/[0.06] px-6 py-4 sm:px-8">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#8f8888]">
          Document body
        </p>
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <div className="max-w-none">
          <DocumentMarkdown content={content} />
        </div>
      </div>
    </LibraryPanel>
  );
}
