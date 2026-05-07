import type { ReactNode } from 'react';
import {
  DOCUMENT_FORMAT_LABELS,
  type DocumentFormatBucket,
} from '../documentPresentation';
import type { LibraryCluster } from '../libraryPageModel';
import { LibraryIcon } from './LibraryIcon';

type Props = {
  documentCount: number;
  favoriteCount: number;
  cleanupCount: number;
  researchCount: number;
  formatCounts: Record<DocumentFormatBucket, number>;
  topClusters: LibraryCluster[];
};

function StatCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-8 ${className ?? 'bg-[#1f1f1f]'}`}
    >
      {children}
    </div>
  );
}

export function LibraryOverviewStats({
  documentCount,
  favoriteCount,
  cleanupCount,
  researchCount,
  formatCounts,
  topClusters,
}: Props) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr_0.9fr]">
      <StatCard className="bg-[#2a2a2a]">
        <div className="relative z-10">
          <p className="text-[0.64rem] font-bold uppercase tracking-[0.28em] text-[#a39d9d]">
            Total intelligence assets
          </p>
          <h1 className="mt-4 text-[clamp(3.4rem,7vw,5.1rem)] font-black tracking-[-0.08em] text-white leading-none">
            {documentCount}
          </h1>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] bg-black/20 px-4 py-4">
              <div className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#bcb5b5]">Favorites</div>
              <div className="mt-2 text-[1.4rem] font-bold tracking-[-0.05em] text-white">{favoriteCount}</div>
            </div>
            <div className="rounded-[18px] bg-black/20 px-4 py-4">
              <div className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#bcb5b5]">Cleanup</div>
              <div className="mt-2 text-[1.4rem] font-bold tracking-[-0.05em] text-white">{cleanupCount}</div>
            </div>
            <div className="rounded-[18px] bg-black/20 px-4 py-4">
              <div className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#bcb5b5]">Research</div>
              <div className="mt-2 text-[1.4rem] font-bold tracking-[-0.05em] text-white">{researchCount}</div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-6 right-0 text-white/[0.06]">
          <LibraryIcon name="grid" className="h-36 w-36" />
        </div>
      </StatCard>

      <StatCard className="bg-[#1b1b1b]">
        <p className="text-[0.64rem] font-bold uppercase tracking-[0.28em] text-[#a39d9d]">
          Format distribution
        </p>
        <div className="mt-6 space-y-5">
          {(Object.entries(DOCUMENT_FORMAT_LABELS) as Array<[DocumentFormatBucket, string]>).map(([bucket, label]) => {
            const count = formatCounts[bucket];
            const percent = documentCount > 0 ? Math.max((count / documentCount) * 100, count > 0 ? 8 : 0) : 0;

            return (
              <div key={bucket}>
                <div className="flex items-center justify-between text-[0.76rem]">
                  <span className="text-[#cfc7c7]">{label}</span>
                  <span className="font-bold text-white">{count}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[#353535]">
                  <div
                    className={`h-full rounded-full ${bucket === 'pdf' ? 'bg-[#d7d1d1]' : bucket === 'web' ? 'bg-[#848080]' : 'bg-[#5d5858]'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </StatCard>

      <StatCard className="bg-[#1b1b1b]">
        <p className="text-[0.64rem] font-bold uppercase tracking-[0.28em] text-[#a39d9d]">
          Node clusters
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {topClusters.map((cluster) => (
            <span
              key={cluster.label}
              className="rounded-[8px] bg-[#2a2a2a] px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white"
            >
              {cluster.label} ({cluster.count})
            </span>
          ))}
        </div>
        <div className="mt-10 flex items-center gap-3 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[#7b7575]">
          <span className="flex h-2.5 w-2.5 rounded-full bg-[#d5cfcf] animate-status-pulse" />
          <span>Core synchronized</span>
        </div>
      </StatCard>
    </section>
  );
}
