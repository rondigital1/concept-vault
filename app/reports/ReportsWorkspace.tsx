import Link from 'next/link';
import {
  ResultsActionLink,
  ResultsContainer,
  ResultsIcon,
  ResultsMetadataRow,
  ResultsPill,
  ResultsRouteShell,
  ResultsSidePanel,
  ResultsTopicChip,
} from './resultsUi';
import { formatDisplayDate, formatDisplayStamp, trimIdentifier, type ReportCardSummary } from './reportsViewModel';

function MetricCard({
  title,
  value,
  description,
  meta,
}: {
  title: string;
  value: string;
  description: string;
  meta: string;
}) {
  return (
    <div className="rounded-[28px] bg-[#2a2a2a] px-6 py-6 shadow-[0_20px_48px_rgba(0,0,0,0.22)]">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#141414] text-[#f1ecec]">
          <ResultsIcon name="stack" className="h-[1rem] w-[1rem]" />
        </div>
        <div>
          <h3 className="text-[0.95rem] font-bold tracking-[-0.02em] text-white">{title}</h3>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#817b7b]">{meta}</p>
        </div>
      </div>
      <p className="text-[2.8rem] font-black tracking-[-0.07em] text-white">{value}</p>
      <p className="mt-4 text-[0.98rem] leading-7 text-[#bdb4b4]">{description}</p>
    </div>
  );
}

function ArchiveCard({ report }: { report: ReportCardSummary }) {
  return (
    <Link
      href={`/reports/${report.id}`}
      className="group block rounded-[28px] bg-[#2a2a2a] px-6 py-6 transition duration-300 hover:-translate-y-0.5 hover:bg-[#303030]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ResultsPill>{formatDisplayDate(report.day)}</ResultsPill>
          {report.isUnread ? (
            <ResultsPill tone="inverse" className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#171717] animate-pulse" />
              Unread
            </ResultsPill>
          ) : null}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-[#e7e2e2] transition group-hover:bg-[#181818]">
          <ResultsIcon name="arrow-up-right" className="h-4 w-4" />
        </span>
      </div>

      <h3 className="mt-5 text-[1.36rem] font-bold tracking-[-0.04em] text-white">{report.title}</h3>
      <p className="mt-4 line-clamp-4 text-[0.98rem] leading-7 text-[#beb5b5]">
        {report.summaryPreview ?? 'Open the dossier to review the full executive summary and source-by-source notes.'}
      </p>

      {report.topicsCovered.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {report.topicsCovered.slice(0, 3).map((topic) => (
            <ResultsTopicChip key={topic} topic={topic} />
          ))}
          {report.topicsCovered.length > 3 ? (
            <span className="rounded-full bg-[#111111] px-3 py-1.5 text-[0.68rem] font-semibold text-[#d3cbcb]">
              +{report.topicsCovered.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-4 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8f8888]">
        <span>{formatDisplayDate(report.createdAt)}</span>
        <span>{report.sourcesCount ?? 0} sources</span>
      </div>
    </Link>
  );
}

function EmptyStatePanel() {
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
      <section className="rounded-[30px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1eded] text-[#161616]">
          <ResultsIcon name="archive" className="h-6 w-6" />
        </div>
        <p className="mt-8 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#918b8b]">No approved dossiers</p>
        <h2 className="mt-4 max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-black tracking-[-0.07em] text-white">The reports archive is still empty.</h2>
        <p className="mt-6 max-w-3xl text-[1.05rem] leading-8 text-[#b7b0b0]">
          Generate a report from Research after enough vetted evidence has been approved. The finished synthesis will land here as a persistent dossier with topic coverage, sources, and a direct path back into the workflow.
        </p>
      </section>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <ResultsSidePanel title="Archive actions">
          <p className="mt-4 text-[0.98rem] leading-7 text-[#beb5b5]">
            Open Research to run the next synthesis cycle, or add more material into the vault before generating the first report.
          </p>
        </ResultsSidePanel>

        <div className="space-y-3">
          <ResultsActionLink href="/today" label="Open Research" icon="research" tone="primary" fullWidth />
          <ResultsActionLink href="/ingest" label="Add Content" icon="plus" fullWidth />
          <ResultsActionLink href="/library" label="Open Library" icon="library" fullWidth />
        </div>
      </aside>
    </div>
  );
}

export function ReportsWorkspace({ reports }: { reports: ReportCardSummary[] }) {
  const latestReport = reports[0] ?? null;
  const unreadCount = reports.filter((report) => report.isUnread).length;
  const uniqueTopicCount = new Set(reports.flatMap((report) => report.topicsCovered)).size;
  const totalSources = reports.reduce((sum, report) => sum + (report.sourcesCount ?? 0), 0);
  const latestCitations = latestReport?.citations.slice(0, 3) ?? [];

  return (
    <ResultsRouteShell showReadyPulse={Boolean(latestReport)}>
      <ResultsContainer>
        <header className="max-w-5xl animate-workbench-enter">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-[#8c8787]">
            <span className="rounded-sm bg-[#2a2a2a] px-3 py-1.5 text-[#ddd8d8]">ARCHIVE_SCOPE: RESEARCH_REPORTS</span>
            <span>{latestReport ? `LATEST: ${formatDisplayStamp(latestReport.createdAt)}` : 'STATUS: AWAITING FIRST DOSSIER'}</span>
          </div>
          <h1 className="max-w-6xl text-[clamp(3rem,8vw,5.7rem)] font-black leading-[0.95] tracking-[-0.085em] text-white">
            Research Results
          </h1>
          <p className="mt-6 max-w-3xl text-[1.14rem] font-[380] leading-8 text-[#b7b0b0]">
            Approved reports live here as finished dossiers. Scan the latest synthesis, verify source coverage, and jump back into Research when the next cycle is ready.
          </p>
        </header>

        <div className="mt-12">
          {!latestReport ? (
            <EmptyStatePanel />
          ) : (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
              <section className="space-y-8">
                <article className="relative overflow-hidden rounded-[30px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
                  <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />

                  <div className="mb-8 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2efef] text-[#161616] shadow-[0_10px_30px_rgba(255,255,255,0.08)]">
                        <ResultsIcon name="analytics" className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-white">Latest dossier</p>
                        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#8b8484]">
                          {formatDisplayDate(latestReport.day)} · {latestReport.isUnread ? 'Unread' : 'Opened'} · {latestReport.sourcesCount ?? 0} sources
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/reports/${latestReport.id}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-[#d8d2d2] transition hover:bg-white/10 hover:text-white"
                      aria-label="Open latest dossier"
                    >
                      <ResultsIcon name="arrow-up-right" className="h-5 w-5" />
                    </Link>
                  </div>

                  <h2 className="max-w-4xl text-[clamp(2rem,4vw,3.35rem)] font-black leading-[1.02] tracking-[-0.065em] text-white">
                    {latestReport.title}
                  </h2>

                  <div className="mt-8 space-y-5">
                    {(latestReport.summaryLines.length > 0
                      ? latestReport.summaryLines.slice(0, 2)
                      : ['Open the newest report to review the executive summary and source-by-source notes captured by the research pipeline.']).map((line, index) => (
                      <p key={`${line}-${index}`} className="max-w-3xl text-[1.08rem] leading-9 text-[#ece8e5]">
                        {line}
                      </p>
                    ))}
                  </div>

                  <div className="my-8 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[20px] bg-[#111111] px-6 py-6">
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#7e7777]">Source coverage</span>
                      <div className="mt-3 text-[clamp(2.4rem,4vw,3.8rem)] font-black tracking-[-0.06em] text-white">
                        {latestReport.sourcesCount ?? '—'}
                      </div>
                    </div>
                    <div className="rounded-[20px] bg-[#111111] px-6 py-6">
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#7e7777]">Topic span</span>
                      <div className="mt-3 text-[clamp(2.4rem,4vw,3.8rem)] font-black tracking-[-0.06em] text-white">
                        {latestReport.topicsCovered.length || '—'}
                      </div>
                    </div>
                  </div>

                  <p className="max-w-3xl text-[1.02rem] leading-8 text-[#b8b0af]">
                    {latestReport.summaryLines[2] ??
                      latestReport.summaryPreview ??
                      'Open the dossier to review the full synthesis, recommended next steps, and the linked evidence stack.'}
                  </p>

                  {latestReport.topicsCovered.length > 0 ? (
                    <div className="mt-8 flex flex-wrap gap-2">
                      {latestReport.topicsCovered.map((topic) => (
                        <ResultsTopicChip key={topic} topic={topic} />
                      ))}
                    </div>
                  ) : null}
                </article>

                <div className="grid gap-6 md:grid-cols-2">
                  <MetricCard
                    title="Archive volume"
                    value={`${reports.length}`}
                    description={`${reports.length === 1 ? '1 dossier is' : `${reports.length} dossiers are`} approved and immediately available to reopen.`}
                    meta={`${unreadCount} unread`}
                  />
                  <MetricCard
                    title="Topic coverage"
                    value={`${uniqueTopicCount}`}
                    description={`${totalSources} approved sources are represented across the archived reports now visible in this registry.`}
                    meta={latestReport.topicId ? `topic ${trimIdentifier(latestReport.topicId, 8)}` : 'all topics'}
                  />
                </div>

                <section className="pb-8">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Approved archive</p>
                      <h2 className="mt-2 text-[2.1rem] font-black tracking-[-0.06em] text-white">Recent dossiers</h2>
                      <p className="mt-2 max-w-2xl text-[0.98rem] leading-7 text-[#b9b0b0]">
                        Every approved report remains here as a finished output. Open one to read the full synthesis, mark it read, or continue the topic from Research.
                      </p>
                    </div>
                    <div className="inline-flex items-center rounded-full bg-[#1d1d1d] px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#d7d0d0]">
                      {reports.length} {reports.length === 1 ? 'dossier' : 'dossiers'}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {reports.map((report) => (
                      <ArchiveCard key={report.id} report={report} />
                    ))}
                  </div>
                </section>
              </section>

              <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                <ResultsSidePanel title="Verified citations" icon="stack">
                  {latestCitations.length > 0 ? (
                    <ul className="mt-6 space-y-6">
                      {latestCitations.map((citation) => (
                        <li key={citation.url}>
                          <a href={citation.url} target="_blank" rel="noreferrer" className="block transition hover:opacity-80">
                            <div className="text-[0.58rem] font-semibold uppercase tracking-[0.26em] text-[#8d8787]">{citation.source}</div>
                            <div className="mt-2 text-[1rem] leading-7 text-white">{citation.title}</div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-6 rounded-[22px] border border-white/8 bg-[#171717] px-5 py-5">
                      <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#d9d1d1]">Citation preview unavailable</p>
                      <p className="mt-3 text-[0.96rem] leading-7 text-[#beb5b5]">
                        The latest dossier does not expose parsed citations in the archive preview yet. Open the full dossier to review the embedded source section.
                      </p>
                    </div>
                  )}

                  <div className="mt-6">
                    <ResultsActionLink
                      href={`/reports/${latestReport.id}`}
                      label={latestCitations.length > 0 ? 'Open citations' : 'Open dossier'}
                      icon="report"
                      fullWidth
                    />
                  </div>
                </ResultsSidePanel>

                <ResultsSidePanel title="Process metadata" className="bg-[#111111] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
                  <div className="mt-6 space-y-1">
                    <ResultsMetadataRow label="Generated" value={formatDisplayDate(latestReport.createdAt)} />
                    <ResultsMetadataRow label="Read status" value={latestReport.isUnread ? 'UNREAD' : 'OPENED'} accent />
                    <ResultsMetadataRow label="Run id" value={trimIdentifier(latestReport.runId) ?? 'MANUAL'} />
                    <ResultsMetadataRow label="Artifact id" value={trimIdentifier(latestReport.id) ?? latestReport.id} />
                    <ResultsMetadataRow label="Topics indexed" value={`${uniqueTopicCount}`} />
                  </div>
                </ResultsSidePanel>

                <div className="space-y-3">
                  <ResultsActionLink href={`/reports/${latestReport.id}`} label="Open full dossier" icon="report" tone="primary" fullWidth />
                  <ResultsActionLink href="/today" label="Continue in Research" icon="research" fullWidth />
                  <ResultsActionLink href="/ingest" label="Add Content" icon="plus" fullWidth />
                </div>
              </aside>
            </div>
          )}
        </div>

        <footer className="mt-[4.5rem] border-t border-white/5 py-10">
          <div className="flex flex-col gap-4 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#777171] sm:flex-row sm:items-center sm:justify-between">
            <p>© Concept Vault research unit. Approved outputs remain human-directed and reviewable.</p>
            <div className="flex flex-wrap gap-6">
              <Link href="/today" className="transition hover:text-white">
                Research
              </Link>
              <Link href="/library" className="transition hover:text-white">
                Library
              </Link>
              <Link href="/ingest" className="transition hover:text-white">
                Ingest
              </Link>
            </div>
          </div>
        </footer>
      </ResultsContainer>
    </ResultsRouteShell>
  );
}
