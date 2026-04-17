import Link from 'next/link';
import { PRIMARY_TOP_NAV_KEYS, getTopNavItems } from '@/app/components/topNav';
import { formatDisplayDate, formatDisplayStamp, trimIdentifier, type ReportCardSummary } from './reportsViewModel';

type IconName =
  | 'spark'
  | 'settings'
  | 'bell'
  | 'research'
  | 'report'
  | 'library'
  | 'chat'
  | 'arrow-up-right'
  | 'analytics'
  | 'stack'
  | 'archive'
  | 'plus';

type NavItem = {
  label: string;
  href: string;
  icon?: IconName;
  active?: boolean;
};

const TOP_NAV_ITEMS = getTopNavItems(PRIMARY_TOP_NAV_KEYS).map((item) => ({
  href: item.href,
  label: item.label,
  active: item.key === 'reports',
}));

const SIDE_NAV_ITEMS: NavItem[] = [
  { label: 'Research', href: '/today', icon: 'research' },
  { label: 'Reports', href: '/reports', icon: 'report', active: true },
  { label: 'Library', href: '/library', icon: 'library' },
  { label: 'Ask Vault', href: '/chat', icon: 'chat' },
];

function Icon({ name, className = 'h-[1.15rem] w-[1.15rem]' }: { name: IconName; className?: string }) {
  switch (name) {
    case 'spark':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 13.92 8.08 18.25 10 13.92 11.92 12 16.25 10.08 11.92 5.75 10 10.08 8.08 12 3.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.25 16.75 19.21 18.79 21.25 19.75 19.21 20.71 18.25 22.75 17.29 20.71 15.25 19.75 17.29 18.79 18.25 16.75Z" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.33 4.69a1.75 1.75 0 0 1 3.34 0l.2.76a1.75 1.75 0 0 0 2.52 1.07l.68-.39a1.75 1.75 0 0 1 2.37.64l.82 1.42a1.75 1.75 0 0 1-.63 2.37l-.67.39a1.75 1.75 0 0 0 0 3.04l.67.39a1.75 1.75 0 0 1 .63 2.37l-.82 1.42a1.75 1.75 0 0 1-2.37.64l-.68-.39a1.75 1.75 0 0 0-2.52 1.07l-.2.76a1.75 1.75 0 0 1-3.34 0l-.2-.76a1.75 1.75 0 0 0-2.52-1.07l-.68.39a1.75 1.75 0 0 1-2.37-.64l-.82-1.42a1.75 1.75 0 0 1 .63-2.37l.67-.39a1.75 1.75 0 0 0 0-3.04l-.67-.39a1.75 1.75 0 0 1-.63-2.37l.82-1.42a1.75 1.75 0 0 1 2.37-.64l.68.39a1.75 1.75 0 0 0 2.52-1.07l.2-.76Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18.75a3 3 0 0 1-6 0" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 16.5H6.75c.6-.65 1.05-1.86 1.05-3.5V10.5a4.2 4.2 0 1 1 8.4 0V13c0 1.64.45 2.85 1.05 3.5Z" />
        </svg>
      );
    case 'research':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <circle cx="10.25" cy="10.25" r="5.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.5 14.5 4.75 4.75" />
        </svg>
      );
    case 'report':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h7.13l3.62 3.62v12.88H7.5a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75v4.5h4.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 12h6M9.75 15.75h6" />
        </svg>
      );
    case 'library':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5A2.25 2.25 0 0 1 19.5 6.75v10.5A2.25 2.25 0 0 1 17.25 19.5H6.75A2.25 2.25 0 0 1 4.5 17.25V6.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 8.25h3.75v7.5H8.25zM15.75 8.25v7.5" />
        </svg>
      );
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 17.25H4.88A1.88 1.88 0 0 1 3 15.38V6.88C3 5.84 3.84 5 4.88 5h14.24C20.16 5 21 5.84 21 6.88v8.5c0 1.04-.84 1.87-1.88 1.87H11.5L7.5 21v-3.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.25h8M8 13.5h5.5" />
        </svg>
      );
    case 'arrow-up-right':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75 15.75 8.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6.75V15" />
        </svg>
      );
    case 'analytics':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 18.75h13.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5V9.75M12 16.5V6.75M16.5 16.5v-3.75" />
        </svg>
      );
    case 'stack':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 5.25 8.25 4.5L12 14.25 3.75 9.75 12 5.25Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 12.75 8.25 4.5 8.25-4.5" />
        </svg>
      );
    case 'archive':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15v10.5A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V7.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h16.5v3H3.75zM9.75 12h4.5" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.25v13.5M5.25 12h13.5" />
        </svg>
      );
  }
}

function TopNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 bg-[rgba(19,19,19,0.58)] backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1560px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-85">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f0f0] text-[0.72rem] font-black uppercase tracking-[0.18em] text-[#131313]">
            CV
          </div>
          <div className="leading-none">
            <div className="text-[1.2rem] font-black tracking-[-0.06em] text-white">Concept Vault</div>
            <div className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#8f8a8a]">Research Intelligence</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {TOP_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative text-[1.1rem] font-medium tracking-[-0.035em] transition-colors ${
                item.active ? 'text-white' : 'text-[#8f8a8a] hover:text-white'
              }`}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
              {item.active && <span className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-white" />}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button type="button" className="rounded-full p-2 text-white/90 transition hover:bg-white/5" aria-label="Settings">
            <Icon name="settings" />
          </button>
          <button type="button" className="relative rounded-full p-2 text-white/90 transition hover:bg-white/5" aria-label="Notifications">
            <Icon name="bell" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#f0ecec]" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ececec] text-[0.72rem] font-black tracking-[0.18em] text-[#1a1a1a]">
            CV
          </div>
        </div>
      </div>
    </header>
  );
}

function SideNav() {
  return (
    <>
      <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-64 bg-[#151515] px-5 py-6 lg:flex lg:flex-col">
        <Link href="/reports" className="px-4 transition-opacity hover:opacity-85">
          <p className="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-white">RESULT_ARCHIVE</p>
          <p className="mt-1 text-[0.76rem] uppercase tracking-[0.08em] text-[#747070]">APPROVED_DOSSIERS</p>
        </Link>

        <div className="mt-10 px-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6f6a6a]">Workspace</p>
        </div>

        <nav className="mt-3 space-y-2">
          {SIDE_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 rounded-full px-5 py-3 text-[0.78rem] uppercase tracking-[0.16em] transition ${
                item.active ? 'bg-[#f3f0f0] text-[#171717]' : 'text-[#787373] hover:bg-white/6 hover:text-white'
              }`}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.icon ? <Icon name={item.icon} /> : null}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-6">
          <div className="px-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6f6a6a]">Quick Links</p>
          </div>
          <Link
            href="/today"
            className="flex w-full items-center justify-center rounded-full bg-[#f3f0f0] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#171717] transition hover:bg-white"
          >
            OPEN RESEARCH
          </Link>
          <Link href="/ingest" className="flex items-center gap-4 px-5 py-3 text-[0.78rem] uppercase tracking-[0.16em] text-[#787373] transition hover:text-white">
            <Icon name="plus" />
            <span>Add Content</span>
          </Link>
        </div>
      </aside>

      <div className="mb-10 flex gap-3 overflow-x-auto pb-2 lg:hidden">
        {SIDE_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] ${
              item.active ? 'bg-[#f3f0f0] text-[#141414]' : 'bg-[#1f1f1f] text-[#b3adad]'
            }`}
            aria-current={item.active ? 'page' : undefined}
          >
            {item.icon ? <Icon name={item.icon} className="h-4 w-4" /> : null}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

function TopicChip({ topic }: { topic: string }) {
  return (
    <span className="rounded-full bg-[#101010] px-3 py-1.5 text-[0.68rem] font-semibold tracking-[0.02em] text-[#d3cbcb]">
      {topic}
    </span>
  );
}

function ActionButton({
  href,
  label,
  icon,
  tone = 'secondary',
}: {
  href: string;
  label: string;
  icon: IconName;
  tone?: 'primary' | 'secondary';
}) {
  const className =
    tone === 'primary'
      ? 'bg-[#f2eeee] text-[#171717] hover:bg-white'
      : 'bg-transparent text-white ring-1 ring-white/12 hover:bg-white/5';

  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 rounded-full px-5 py-4 text-[0.72rem] font-bold uppercase tracking-[0.28em] transition ${className}`}
    >
      <Icon name={icon} className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

function MetadataRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#7d7878]">{label}</span>
      <span className={`text-right text-[0.76rem] font-mono ${accent ? 'text-[#efeded]' : 'text-white'}`}>{value}</span>
    </div>
  );
}

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
          <Icon name="stack" className="h-[1rem] w-[1rem]" />
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
          <span className="rounded-full bg-[#111111] px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#c2bbbb]">
            {formatDisplayDate(report.day)}
          </span>
          {report.isUnread ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#efeded]">
              <span className="h-2 w-2 rounded-full bg-[#f3efef] animate-pulse" />
              Unread
            </span>
          ) : null}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-[#e7e2e2] transition group-hover:bg-[#181818]">
          <Icon name="arrow-up-right" className="h-4 w-4" />
        </span>
      </div>

      <h3 className="mt-5 text-[1.36rem] font-bold tracking-[-0.04em] text-white">{report.title}</h3>
      <p className="mt-4 line-clamp-4 text-[0.98rem] leading-7 text-[#beb5b5]">
        {report.summaryPreview ?? 'Open the dossier to review the full executive summary and source-by-source notes.'}
      </p>

      {report.topicsCovered.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {report.topicsCovered.slice(0, 3).map((topic) => (
            <TopicChip key={topic} topic={topic} />
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
          <Icon name="archive" className="h-6 w-6" />
        </div>
        <p className="mt-8 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#918b8b]">No approved dossiers</p>
        <h2 className="mt-4 max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-black tracking-[-0.07em] text-white">The reports archive is still empty.</h2>
        <p className="mt-6 max-w-3xl text-[1.05rem] leading-8 text-[#b7b0b0]">
          Generate a report from Research after enough vetted evidence has been approved. The finished synthesis will land here as a persistent dossier with topic coverage, sources, and a direct path back into the workflow.
        </p>
      </section>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-[28px] bg-[#232323] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.26)]">
          <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-white">Archive actions</h3>
          <p className="mt-4 text-[0.98rem] leading-7 text-[#beb5b5]">
            Open Research to run the next synthesis cycle, or add more material into the vault before generating the first report.
          </p>
        </section>

        <div className="space-y-3">
          <ActionButton href="/today" label="Open Research" icon="research" tone="primary" />
          <ActionButton href="/ingest" label="Add Content" icon="plus" />
          <ActionButton href="/library" label="Open Library" icon="library" />
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
    <div className="relative min-h-screen overflow-hidden bg-[#131313] text-[#ece9e8]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-5%] h-[28rem] w-[28rem] rounded-full bg-white/[0.03] blur-[120px]" />
        <div className="absolute right-[-12%] top-[12%] h-[24rem] w-[24rem] rounded-full bg-white/[0.025] blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.04]" />
      </div>

      <TopNav />
      <SideNav />

      <main className="relative px-4 pb-16 pt-24 sm:px-6 lg:ml-64 lg:px-10">
        <div className="mx-auto max-w-[1180px]">
          <header className="max-w-5xl animate-workbench-enter">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-[#8c8787]">
              <span className="rounded-sm bg-[#2a2a2a] px-3 py-1.5 text-[#ddd8d8]">ARCHIVE_SCOPE: RESEARCH_REPORTS</span>
              <span>{latestReport ? `LATEST: ${formatDisplayStamp(latestReport.createdAt)}` : 'STATUS: AWAITING FIRST DOSSIER'}</span>
            </div>
            <h1 className="max-w-6xl text-[clamp(3rem,8vw,5.7rem)] font-black tracking-[-0.085em] text-white leading-[0.95]">
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
                          <Icon name="analytics" className="h-5 w-5" />
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
                        <Icon name="arrow-up-right" className="h-5 w-5" />
                      </Link>
                    </div>

                    <h2 className="max-w-4xl text-[clamp(2rem,4vw,3.35rem)] font-black tracking-[-0.065em] text-white leading-[1.02]">
                      {latestReport.title}
                    </h2>

                    <div className="mt-8 space-y-5">
                      {(latestReport.summaryLines.length > 0 ? latestReport.summaryLines.slice(0, 2) : [
                        'Open the newest report to review the executive summary and source-by-source notes captured by the research pipeline.',
                      ]).map((line, index) => (
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
                          <TopicChip key={topic} topic={topic} />
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
                  <section className="rounded-[28px] bg-[#232323] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.26)]">
                    <h3 className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-white">
                      <Icon name="stack" className="h-4 w-4" />
                      Verified citations
                    </h3>

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
                      <p className="mt-6 text-[0.98rem] leading-7 text-[#beb5b5]">
                        The latest report does not expose a parsed source list here yet. Open the dossier to review the full source section.
                      </p>
                    )}

                    <ActionButton href={`/reports/${latestReport.id}`} label="Open source section" icon="report" />
                  </section>

                  <section className="rounded-[28px] bg-[#111111] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
                    <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-[#8f8888]">Process metadata</h3>
                    <div className="mt-6 space-y-1">
                      <MetadataRow label="Generated" value={formatDisplayDate(latestReport.createdAt)} />
                      <MetadataRow label="Read status" value={latestReport.isUnread ? 'UNREAD' : 'OPENED'} accent />
                      <MetadataRow label="Run id" value={trimIdentifier(latestReport.runId) ?? 'MANUAL'} />
                      <MetadataRow label="Artifact id" value={trimIdentifier(latestReport.id) ?? latestReport.id} />
                      <MetadataRow label="Topics indexed" value={`${uniqueTopicCount}`} />
                    </div>
                  </section>

                  <div className="space-y-3">
                    <ActionButton href={`/reports/${latestReport.id}`} label="Open full dossier" icon="report" tone="primary" />
                    <ActionButton href="/today" label="Continue in Research" icon="research" />
                    <ActionButton href="/ingest" label="Add Content" icon="plus" />
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
        </div>

        {latestReport ? (
          <div className="pointer-events-none fixed bottom-8 right-8 hidden flex-col items-center gap-4 xl:flex">
            <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-[rgba(53,53,53,0.36)] shadow-[0_20px_44px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
              <div className="h-8 w-8 rounded-full bg-[linear-gradient(135deg,#ffffff,#9a9a9a)] animate-[pulse_3.2s_ease-in-out_infinite]" />
            </div>
            <div className="text-[0.58rem] font-bold uppercase tracking-[0.34em] text-[#857e7e]">ARCHIVE_READY</div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
