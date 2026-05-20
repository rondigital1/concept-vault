import { monoLabelClass } from '../constants';
import { formatModeLabel } from '../ingestPresentation';
import type { FeedbackState, IngestMode, IngestWorkspaceStats } from '../types';

export function IngestStatusCard({
  mode,
  readyState,
  stats,
  feedback,
}: {
  mode: IngestMode;
  readyState: string;
  stats: IngestWorkspaceStats;
  feedback: FeedbackState;
}) {
  const toneClassName =
    feedback.tone === 'success'
      ? 'border-[#3d5648] bg-[rgba(34,62,47,0.78)] text-[#d5eadb]'
      : feedback.tone === 'error'
        ? 'border-[#68433b] bg-[rgba(60,26,24,0.78)] text-[#f2c7bc]'
        : feedback.tone === 'loading'
          ? 'border-[#5b4f36] bg-[rgba(49,35,16,0.78)] text-[#f0d7a7]'
          : 'border-white/[0.08] bg-[rgba(255,255,255,0.03)] text-[#d9d2d2]';

  return (
    <div className="rounded-[1.8rem] border border-white/[0.08] bg-[#2a2a2a] p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#d9d9d9] shadow-[0_0_20px_rgba(255,255,255,0.45)]" />
        <span className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#efefef]">
          {feedback.eyebrow}
        </span>
      </div>
      <h2 className="text-[2rem] font-bold tracking-normal text-white">Import status</h2>
      <p className="mt-4 max-w-sm text-[1.05rem] leading-8 text-[#d1cbcb]">
        Keep intake fast. New content lands in the library immediately, while research activation still follows the normal review and approval flow.
      </p>

      <div
        className={`mt-8 rounded-[1.35rem] border px-5 py-4 ${toneClassName}`}
        aria-live="polite"
      >
        <p className={monoLabelClass}>{formatModeLabel(mode)}</p>
        <p className="mt-3 text-lg font-semibold text-white">{feedback.title}</p>
        <p className="mt-2 text-sm leading-7 text-current">{feedback.description}</p>
      </div>

      <div className="mt-8 space-y-4">
        <div className="rounded-[1.1rem] bg-[#101010] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <span className={monoLabelClass}>Mode</span>
            <span className="font-mono text-[1rem] text-[#f4f4f4]">{formatModeLabel(mode)}</span>
          </div>
        </div>
        <div className="rounded-[1.1rem] bg-[#101010] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <span className={monoLabelClass}>Ready state</span>
            <span className="font-mono text-[1rem] text-[#f4f4f4]">{readyState}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.1rem] bg-[#101010] px-5 py-4">
            <p className={monoLabelClass}>Library documents</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-white">{stats.totalRecords}</p>
          </div>
          <div className="rounded-[1.1rem] bg-[#101010] px-5 py-4">
            <p className={monoLabelClass}>Direct imports</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-white">{stats.directImports}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.1rem] bg-[#101010] px-5 py-4">
            <p className={monoLabelClass}>Research imports</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-white">{stats.researchImports}</p>
          </div>
          <div className="rounded-[1.1rem] bg-[#101010] px-5 py-4">
            <p className={monoLabelClass}>Needs cleanup</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-white">{stats.cleanupCandidates}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
