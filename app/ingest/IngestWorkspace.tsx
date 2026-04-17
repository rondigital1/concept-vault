'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useState,
} from 'react';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ToastContainer, toast } from '@/app/components/Toast';
import {
  PRIMARY_TOP_NAV_KEYS,
  getTopNavItemsWithState,
  isTopNavItemActive,
} from '@/app/components/topNav';
import {
  formatLibraryRelativeDate,
  getDocumentTitleIssue,
  getSourceDisplay,
} from '@/app/library/documentPresentation';
import { ingestContent } from './actions';

type IngestMode = 'file' | 'url' | 'text';
type FeedbackTone = 'default' | 'loading' | 'success' | 'error';

export type IngestWorkspaceDocument = {
  id: string;
  title: string;
  source: string;
  imported_at: string;
  is_webscout_discovered: boolean;
};

export type IngestWorkspaceStats = {
  totalRecords: number;
  directImports: number;
  researchImports: number;
  favorites: number;
  cleanupCandidates: number;
};

type ModeConfig = {
  label: string;
  title: string;
  description: string;
  actionLabel: string;
  footerNote: string;
  helper: string;
};

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.md', '.csv'];
const MAX_FILE_SIZE_MB = 10;

const MODE_CONFIG: Record<IngestMode, ModeConfig> = {
  file: {
    label: 'File Upload',
    title: 'Import a file',
    description: 'Drag in PDFs, markdown notes, transcripts, or exports from your machine.',
    actionLabel: 'Upload File',
    footerNote:
      'Files are parsed inline and added to the library immediately. Any follow-on enrichment still follows the normal review flow.',
    helper: 'PDF, TXT, DOCX, MD, CSV',
  },
  url: {
    label: 'URL Submission',
    title: 'Import a public page',
    description: 'Capture an article or documentation page directly into the library.',
    actionLabel: 'Import URL',
    footerNote:
      'Public http(s) pages are fetched inline and saved as new library documents after extraction succeeds.',
    helper: 'Public http(s) pages only',
  },
  text: {
    label: 'Text Input',
    title: 'Save pasted notes',
    description: 'Store copied notes, excerpts, or transcripts as a first-class library document.',
    actionLabel: 'Save Note',
    footerNote:
      'Manual entries need at least 50 characters so the vault has enough signal to tag and retrieve the document.',
    helper: 'Markdown-friendly text',
  },
};

const SIDE_NAV_ITEMS = [
  { href: '/today', label: 'Research', icon: 'brain' as const },
  { href: '/library', label: 'Library', icon: 'database' as const },
  { href: '/ingest', label: 'Add Content', icon: 'terminal' as const },
  { href: '/reports', label: 'Reports', icon: 'network' as const },
  { href: '/chat', label: 'Ask Vault', icon: 'article' as const },
];

const monoLabelClass = 'text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8484]';
const monoInputClass =
  'w-full rounded-[1.35rem] bg-[#0f0f0f] px-4 py-3.5 text-sm text-[#f1eeee] placeholder:text-[#6f6a6a] outline-none transition duration-200 focus:bg-[#232323] focus:shadow-[0_0_0_1px_rgba(193,193,193,0.14),0_0_0_12px_rgba(119,119,119,0.1)]';
const monoTextareaClass = `${monoInputClass} min-h-[220px] resize-y font-[450]`;

function getDefaultFeedback(mode: IngestMode, selectedFile: File | null, source: string, content: string) {
  if (mode === 'file' && !selectedFile) {
    return {
      tone: 'default' as const,
      eyebrow: 'Awaiting file',
      title: 'Choose a file to begin',
      description: 'Upload a document from your machine to create a new library record.',
    };
  }

  if (mode === 'url' && !source.trim()) {
    return {
      tone: 'default' as const,
      eyebrow: 'Awaiting URL',
      title: 'Paste a public page URL',
      description: 'Use URL import when you want the vault to fetch a public article or docs page inline.',
    };
  }

  if (mode === 'text' && content.trim().length < 50) {
    return {
      tone: 'default' as const,
      eyebrow: 'Awaiting text',
      title: 'Paste enough text to save',
      description: 'Manual notes need at least 50 characters so the vault can classify and retrieve them well.',
    };
  }

  return {
    tone: 'default' as const,
    eyebrow: 'Ready',
    title: 'Ready to import',
    description: 'Review the title if needed, then add this content to the library.',
  };
}

function getUserInitials(userName: string): string {
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);

  return initials || 'U';
}

function formatModeLabel(mode: IngestMode): string {
  return MODE_CONFIG[mode].label;
}

function getReadyStateLabel(mode: IngestMode, selectedFile: File | null, source: string, content: string): string {
  if (mode === 'file') {
    return selectedFile ? 'Ready to import' : 'Choose a file';
  }

  if (mode === 'url') {
    return source.trim() ? 'Ready to import' : 'Paste a URL';
  }

  return content.trim().length >= 50 ? 'Ready to import' : 'Paste enough text';
}

function formatSourceType(source: string, isWebScoutDiscovered: boolean): string {
  if (isWebScoutDiscovered) {
    return 'RESEARCH SOURCE';
  }

  if (/^https?:\/\//i.test(source)) {
    return 'WEB SOURCE';
  }

  return 'DIRECT IMPORT';
}

function formatDocumentMeta(document: IngestWorkspaceDocument): string {
  const relativeDate = formatLibraryRelativeDate(document.imported_at).toUpperCase();
  return `SAVED ${relativeDate} • ${formatSourceType(document.source, document.is_webscout_discovered)}`;
}

function renderIcon(icon: 'terminal' | 'brain' | 'database' | 'network' | 'settings' | 'bell' | 'file' | 'link' | 'article' | 'upload' | 'filter' | 'search' | 'list' | 'logout' | 'check' | 'warning') {
  const common = 'h-5 w-5';

  switch (icon) {
    case 'terminal':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.75h16v10.5H4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 10 2.5 2-2.5 2M12.5 14H16" />
        </svg>
      );
    case 'brain':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5A3.5 3.5 0 0 0 5.5 8v1A2.5 2.5 0 0 0 3 11.5v1A2.5 2.5 0 0 0 5.5 15H6a3 3 0 0 0 3 3h.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 4.5A3.5 3.5 0 0 1 18.5 8v1a2.5 2.5 0 0 1 2.5 2.5v1A2.5 2.5 0 0 1 18.5 15H18a3 3 0 0 1-3 3h-.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M9.5 8.5c.5.8 1.3 1.2 2.5 1.2s2-.4 2.5-1.2M9.5 15.5c.5-.8 1.3-1.2 2.5-1.2s2 .4 2.5 1.2" />
        </svg>
      );
    case 'database':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <ellipse cx="12" cy="6.5" rx="6.5" ry="2.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 6.5v4.5c0 1.52 2.91 2.75 6.5 2.75s6.5-1.23 6.5-2.75V6.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 11v4.5c0 1.52 2.91 2.75 6.5 2.75s6.5-1.23 6.5-2.75V11" />
        </svg>
      );
    case 'network':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h8M6 8v8M18 8v8M8 18h8M7.4 7.4l9.2 9.2M16.6 7.4 7.4 16.6" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 3.75h1.5l.56 2.03c.42.12.83.29 1.2.5l1.93-.95 1.06 1.06-.95 1.93c.21.37.38.78.5 1.2l2.03.56v1.5l-2.03.56c-.12.42-.29.83-.5 1.2l.95 1.93-1.06 1.06-1.93-.95c-.37.21-.78.38-1.2.5l-.56 2.03h-1.5l-.56-2.03a7.9 7.9 0 0 1-1.2-.5l-1.93.95-1.06-1.06.95-1.93a7.9 7.9 0 0 1-.5-1.2l-2.03-.56v-1.5l2.03-.56c.12-.42.29-.83.5-1.2l-.95-1.93 1.06-1.06 1.93.95c.37-.21.78-.38 1.2-.5z" />
          <circle cx="12" cy="12" r="2.75" />
        </svg>
      );
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17.5H9m6 0H6.75c.7-.69 1.25-1.95 1.25-3.25v-2a4 4 0 1 1 8 0v2c0 1.3.55 2.56 1.25 3.25z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.25 17.5a1.75 1.75 0 0 0 3.5 0" />
        </svg>
      );
    case 'file':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h6l3 3v13.5h-9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.75v3h3M9 12h6M9 15h6" />
        </svg>
      );
    case 'link':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 14.25 8 16a3 3 0 1 1-4.24-4.24l2.5-2.5A3 3 0 0 1 10.5 13" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.25 9.75 1.75-1.75a3 3 0 0 1 4.24 4.24l-2.5 2.5A3 3 0 0 1 13.5 11" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.75 15.25 6.5-6.5" />
        </svg>
      );
    case 'article':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.5h10.5v15h-10.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6M9 12h6M9 15.75h4.5" />
        </svg>
      );
    case 'upload':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V7.5M8.75 10.75 12 7.5l3.25 3.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.75 15.5a3.75 3.75 0 0 1 .8-7.42 5.5 5.5 0 0 1 10.65-.42 3.5 3.5 0 1 1 1.05 6.84h-2.5" />
        </svg>
      );
    case 'filter':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15M7.5 12h9M10.5 16.5h3" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <circle cx="11" cy="11" r="5.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m16 16 3.5 3.5" />
        </svg>
      );
    case 'list':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h10M8 12h10M8 17h10" />
          <circle cx="5" cy="7" r=".75" fill="currentColor" />
          <circle cx="5" cy="12" r=".75" fill="currentColor" />
          <circle cx="5" cy="17" r=".75" fill="currentColor" />
        </svg>
      );
    case 'logout':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H7.5v12H10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 8.5 17.5 12 14 15.5M9.5 12h8" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden="true">
          <path d="M12 2.75a9.25 9.25 0 1 0 9.25 9.25A9.26 9.26 0 0 0 12 2.75Zm4.08 7.44-4.74 5.41a.75.75 0 0 1-1.08.04l-2.34-2.2a.75.75 0 0 1 1.03-1.09l1.77 1.66 4.23-4.83a.75.75 0 1 1 1.13.99Z" />
        </svg>
      );
    case 'warning':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden="true">
          <path d="M12 3.25c.5 0 .97.27 1.22.72l8.25 14.5a1.4 1.4 0 0 1-1.22 2.03H3.75a1.4 1.4 0 0 1-1.22-2.03l8.25-14.5c.25-.45.72-.72 1.22-.72Zm0 5.25a.9.9 0 0 0-.9.9v4.25a.9.9 0 1 0 1.8 0V9.4a.9.9 0 0 0-.9-.9Zm0 8.3a1.05 1.05 0 1 0 0-2.1 1.05 1.05 0 0 0 0 2.1Z" />
        </svg>
      );
  }
}

function TopNav({ userName, pathname }: { userName: string; pathname: string }) {
  const userInitials = getUserInitials(userName);
  const navItems = getTopNavItemsWithState(pathname, PRIMARY_TOP_NAV_KEYS);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 bg-[rgba(19,19,19,0.58)] backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1560px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-4">
          <Link href="/ingest" className="leading-none transition-opacity hover:opacity-85">
            <div className="text-[1.18rem] font-black tracking-[-0.07em] text-white sm:text-[1.3rem]">
              CONCEPT_VAULT
            </div>
            <div className="mt-1 hidden text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#8f8a8a] sm:block">
              Add Content
            </div>
          </Link>
          <span className="hidden rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#d9d2d2] lg:inline-flex">
            Library intake
          </span>
        </div>

        <nav className="hidden items-center gap-8 md:flex lg:gap-10">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative text-[1rem] font-medium tracking-[-0.035em] transition-colors lg:text-[1.08rem] ${
                item.active ? 'text-white' : 'text-[#8f8a8a] hover:text-white'
              }`}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
              {item.active ? <span className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-white" /> : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/library"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#d8d2d2] transition hover:bg-white/10 hover:text-white"
            aria-label="Open library"
          >
            {renderIcon('database')}
          </Link>
          <Link
            href="/chat"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#d8d2d2] transition hover:bg-white/10 hover:text-white"
            aria-label="Open Ask Vault"
          >
            {renderIcon('article')}
          </Link>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#ececec] text-[0.72rem] font-black tracking-[0.18em] text-[#1a1a1a]"
            aria-label={userName}
            title={userName}
          >
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}

function SideNav({ pathname }: { pathname: string }) {
  return (
    <>
      <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-64 bg-[#151515] px-5 py-6 lg:flex lg:flex-col">
        <div className="px-4">
          <p className="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-white">Add Content</p>
          <p className="mt-2 text-sm leading-6 text-[#8f8a8a]">
            Bring files, public pages, and pasted notes into the library.
          </p>
        </div>

        <div className="mt-10 px-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6f6a6a]">Workspace</p>
        </div>

        <nav className="mt-3 space-y-2">
          {SIDE_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 rounded-full px-5 py-3 text-[0.78rem] uppercase tracking-[0.16em] transition ${
                isTopNavItemActive(pathname, item.href)
                  ? 'bg-[#f3f0f0] text-[#171717]'
                  : 'text-[#787373] hover:bg-white/6 hover:text-white'
              }`}
              aria-current={isTopNavItemActive(pathname, item.href) ? 'page' : undefined}
            >
              {renderIcon(item.icon)}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-6">
          <div className="px-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6f6a6a]">Next steps</p>
          </div>
          <Link
            href="/today"
            className="flex w-full items-center justify-center rounded-full bg-[#f3f0f0] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#171717] transition hover:bg-white"
          >
            Continue Research
          </Link>
          <Link href="/library" className="flex items-center gap-4 px-5 py-3 text-[0.78rem] uppercase tracking-[0.16em] text-[#787373] transition hover:text-white">
            {renderIcon('database')}
            <span>Open Library</span>
          </Link>
          <Link href="/chat" className="flex items-center gap-4 px-5 py-3 text-[0.78rem] uppercase tracking-[0.16em] text-[#787373] transition hover:text-white">
            {renderIcon('article')}
            <span>Ask Vault</span>
          </Link>
        </div>
      </aside>

      <div className="mb-10 flex gap-3 overflow-x-auto pb-2 lg:hidden">
        {SIDE_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] ${
              isTopNavItemActive(pathname, item.href) ? 'bg-[#f3f0f0] text-[#141414]' : 'bg-[#1f1f1f] text-[#b3adad]'
            }`}
            aria-current={isTopNavItemActive(pathname, item.href) ? 'page' : undefined}
          >
            {renderIcon(item.icon)}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

function ModeTabs({
  mode,
  onSelect,
}: {
  mode: IngestMode;
  onSelect: (mode: IngestMode) => void;
}) {
  return (
    <div className="mb-6 inline-flex w-full max-w-md gap-1 rounded-full bg-[#1b1b1b] p-1 sm:w-auto">
      {(Object.keys(MODE_CONFIG) as IngestMode[]).map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => onSelect(candidate)}
          className={`flex-1 rounded-full px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.22em] transition ${
            mode === candidate
              ? 'bg-[#353535] text-white'
              : 'text-[#958f8f] hover:text-white'
          }`}
        >
          {MODE_CONFIG[candidate].label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block space-y-3">
      <span className={monoLabelClass}>
        {label}
        {optional ? ' / OPTIONAL' : ''}
      </span>
      {children}
    </label>
  );
}

function ActionFooter({
  actionLabel,
  note,
  disabled,
  loading,
  onClick,
}: {
  actionLabel: string;
  note: string;
  disabled: boolean;
  loading: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <p className="max-w-2xl text-sm leading-7 text-[#a19b9b]">{note}</p>
      <button
        type={onClick ? 'button' : 'submit'}
        onClick={onClick}
        disabled={disabled || loading}
        className={`inline-flex min-w-[172px] items-center justify-center rounded-full px-6 py-3 text-[0.8rem] font-bold uppercase tracking-[0.22em] transition ${
          disabled || loading
            ? 'cursor-not-allowed bg-[#252525] text-[#6f6a6a]'
            : 'bg-[#f3f0f0] text-[#171717] hover:scale-[1.015] hover:bg-white'
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner className="h-4 w-4 border-[#525252] border-t-[#111111]" />
            Working
          </span>
        ) : (
          actionLabel
        )}
      </button>
    </div>
  );
}

function StatusCard({
  mode,
  readyState,
  stats,
  feedback,
}: {
  mode: IngestMode;
  readyState: string;
  stats: IngestWorkspaceStats;
  feedback: { tone: FeedbackTone; eyebrow: string; title: string; description: string };
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
      <h2 className="text-[2rem] font-bold tracking-[-0.05em] text-white">Import status</h2>
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
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{stats.totalRecords}</p>
          </div>
          <div className="rounded-[1.1rem] bg-[#101010] px-5 py-4">
            <p className={monoLabelClass}>Direct imports</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{stats.directImports}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.1rem] bg-[#101010] px-5 py-4">
            <p className={monoLabelClass}>Research imports</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{stats.researchImports}</p>
          </div>
          <div className="rounded-[1.1rem] bg-[#101010] px-5 py-4">
            <p className={monoLabelClass}>Needs cleanup</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{stats.cleanupCandidates}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentDocumentRow({
  document,
}: {
  document: IngestWorkspaceDocument;
}) {
  const titleIssue = getDocumentTitleIssue(document.title);
  const status = titleIssue
    ? {
        icon: 'warning' as const,
        label: 'Needs cleanup',
        className: 'text-[#ffb4ab]',
      }
    : {
        icon: 'check' as const,
        label: document.is_webscout_discovered ? 'Research import' : 'Indexed',
        className: 'text-[#d9d9d9]',
      };

  const documentIcon: 'link' | 'article' | 'file' = /^https?:\/\//i.test(document.source)
    ? 'link'
    : document.source.toLowerCase().endsWith('.md')
      ? 'article'
      : 'file';

  return (
    <Link
      href={`/library/${document.id}`}
      className="group flex items-center justify-between gap-4 rounded-[1.15rem] bg-[#101010] px-5 py-5 transition duration-300 hover:bg-[#171717]"
    >
      <div className="flex min-w-0 items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.6rem] bg-[#2a2a2a] text-[#bdb7b7]">
          {renderIcon(documentIcon)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[1.05rem] font-bold tracking-[-0.03em] text-white transition-colors group-hover:text-[#d4d0d0]">
            {document.title}
          </h3>
          <p className="mt-1 truncate text-[0.72rem] uppercase tracking-[0.22em] text-[#8f8787]">
            {formatDocumentMeta(document)}
          </p>
          <p className="mt-1 truncate text-sm text-[#777070]">{getSourceDisplay(document.source)}</p>
        </div>
      </div>
      <div className={`hidden shrink-0 items-center gap-2 text-[0.74rem] font-bold uppercase tracking-[0.22em] ${status.className} md:flex`}>
        {renderIcon(status.icon)}
        <span>{status.label}</span>
      </div>
    </Link>
  );
}

function FileModePanel({
  dragActive,
  selectedFile,
  title,
  titlePlaceholder,
  isLoading,
  isActionDisabled,
  onTitleChange,
  onDrag,
  onDrop,
  onOpenFilePicker,
  onFileInputChange,
  onClearFile,
  onUpload,
  fileInputRef,
}: {
  dragActive: boolean;
  selectedFile: File | null;
  title: string;
  titlePlaceholder: string;
  isLoading: boolean;
  isActionDisabled: boolean;
  onTitleChange: (value: string) => void;
  onDrag: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onOpenFilePicker: () => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onUpload: () => void;
  fileInputRef: { current: HTMLInputElement | null };
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenFilePicker();
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={onOpenFilePicker}
        onKeyDown={handleKeyDown}
        className={`group relative overflow-hidden rounded-[2rem] bg-[#111111] px-6 py-12 text-center outline-none transition duration-300 sm:px-10 sm:py-16 ${
          dragActive ? 'shadow-[0_0_0_1px_rgba(193,193,193,0.24),0_0_0_20px_rgba(193,193,193,0.08)]' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={onFileInputChange}
          className="hidden"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.035),transparent_65%)]" />
        <div className="relative z-10 mx-auto max-w-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#2a2a2a] text-[#d6d1d1] transition duration-300 group-hover:scale-105">
            {renderIcon('upload')}
          </div>
          <h2 className="text-[2.2rem] font-bold tracking-[-0.06em] text-white">{MODE_CONFIG.file.title}</h2>
          <p className="mx-auto mt-4 max-w-md text-[1.05rem] leading-8 text-[#c4bebe]">{MODE_CONFIG.file.description}</p>

          {selectedFile ? (
            <div className="mx-auto mt-8 max-w-md rounded-[1.4rem] bg-[#1b1b1b] px-5 py-5 text-left">
              <p className={monoLabelClass}>SELECTED_FILE</p>
              <p className="mt-3 truncate text-lg font-semibold text-white">{selectedFile.name}</p>
              <p className="mt-1 text-sm text-[#8f8787]">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready for inline extraction
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClearFile();
                }}
                className="mt-4 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#bcb4b4] transition hover:text-white"
              >
                Remove file
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenFilePicker();
              }}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#f3f0f0] px-8 py-4 text-[0.84rem] font-bold uppercase tracking-[0.25em] text-[#171717] transition hover:scale-[1.015] hover:bg-white"
            >
              Browse Files
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <Field label="Title" optional>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={titlePlaceholder}
            className={monoInputClass}
          />
        </Field>
        <div className="rounded-[1.35rem] bg-[#1b1b1b] px-5 py-4">
          <p className={monoLabelClass}>ACCEPTS</p>
          <p className="mt-3 text-sm leading-7 text-[#cdc7c7]">
            {MODE_CONFIG.file.helper}
            <br />
            Up to {MAX_FILE_SIZE_MB}MB
          </p>
        </div>
      </div>

      <ActionFooter
        note={MODE_CONFIG.file.footerNote}
        actionLabel={MODE_CONFIG.file.actionLabel}
        disabled={isActionDisabled}
        loading={isLoading}
        onClick={onUpload}
      />
    </>
  );
}

function UrlModePanel({
  title,
  source,
  titlePlaceholder,
  isLoading,
  isActionDisabled,
  onTitleChange,
  onSourceChange,
}: {
  title: string;
  source: string;
  titlePlaceholder: string;
  isLoading: boolean;
  isActionDisabled: boolean;
  onTitleChange: (value: string) => void;
  onSourceChange: (value: string) => void;
}) {
  return (
    <>
      <div className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_62%)]" />
        <div className="relative z-10">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2a2a] text-[#d6d1d1]">
            {renderIcon('link')}
          </div>
          <h2 className="text-[2.1rem] font-bold tracking-[-0.06em] text-white">{MODE_CONFIG.url.title}</h2>
          <p className="mt-3 max-w-xl text-[1.02rem] leading-8 text-[#c4bebe]">{MODE_CONFIG.url.description}</p>

          <div className="mt-8 space-y-5">
            <Field label="Title" optional>
              <input
                type="text"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder={titlePlaceholder}
                className={monoInputClass}
              />
            </Field>

            <Field label="URL">
              <input
                type="url"
                value={source}
                onChange={(event) => onSourceChange(event.target.value)}
                placeholder="https://example.com/article"
                className={monoInputClass}
                required
              />
            </Field>

            <div className="rounded-[1.35rem] bg-[#1b1b1b] px-5 py-4">
              <p className={monoLabelClass}>CAPTURE_POLICY</p>
              <p className="mt-3 text-sm leading-7 text-[#cdc7c7]">
                Public articles and docs pages are fetched inline. Explicit approval is still required before any WebScout proposal becomes active.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ActionFooter
        note={MODE_CONFIG.url.footerNote}
        actionLabel={MODE_CONFIG.url.actionLabel}
        disabled={isActionDisabled}
        loading={isLoading}
      />
    </>
  );
}

function TextModePanel({
  title,
  source,
  content,
  titlePlaceholder,
  isLoading,
  isActionDisabled,
  onTitleChange,
  onSourceChange,
  onContentChange,
}: {
  title: string;
  source: string;
  content: string;
  titlePlaceholder: string;
  isLoading: boolean;
  isActionDisabled: boolean;
  onTitleChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onContentChange: (value: string) => void;
}) {
  return (
    <>
      <div className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_62%)]" />
        <div className="relative z-10">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2a2a] text-[#d6d1d1]">
            {renderIcon('article')}
          </div>
          <h2 className="text-[2.1rem] font-bold tracking-[-0.06em] text-white">{MODE_CONFIG.text.title}</h2>
          <p className="mt-3 max-w-xl text-[1.02rem] leading-8 text-[#c4bebe]">{MODE_CONFIG.text.description}</p>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <Field label="Title" optional>
              <input
                type="text"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder={titlePlaceholder}
                className={monoInputClass}
              />
            </Field>
            <Field label="Source" optional>
              <input
                type="text"
                value={source}
                onChange={(event) => onSourceChange(event.target.value)}
                placeholder="Book, transcript, or where this came from"
                className={monoInputClass}
              />
            </Field>
          </div>

          <div className="mt-5">
            <Field label="Content">
              <textarea
                value={content}
                onChange={(event) => onContentChange(event.target.value)}
                placeholder={'Paste your content here.\n\nMarkdown is supported for headings, lists, links, and code.'}
                className={monoTextareaClass}
                required
              />
            </Field>
            <div className="mt-3 flex flex-col gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-[#8f8787] sm:flex-row sm:items-center sm:justify-between">
              <span>
                {content.length} characters
                {content.length < 50 ? ` • ${50 - content.length} more needed` : ''}
              </span>
              <span>{MODE_CONFIG.text.helper}</span>
            </div>
          </div>
        </div>
      </div>

      <ActionFooter
        note={MODE_CONFIG.text.footerNote}
        actionLabel={MODE_CONFIG.text.actionLabel}
        disabled={isActionDisabled}
        loading={isLoading}
      />
    </>
  );
}

export function IngestWorkspace({
  recentDocuments,
  stats,
  userName,
}: {
  recentDocuments: IngestWorkspaceDocument[];
  stats: IngestWorkspaceStats;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<IngestMode>('file');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{
    tone: FeedbackTone;
    eyebrow: string;
    title: string;
    description: string;
  } | null>(null);

  const titlePlaceholder =
    mode === 'file'
      ? 'Leave blank to use the filename'
      : mode === 'url'
        ? 'Leave blank to use the page title'
        : 'Optional title for this note or excerpt';

  const isTextReady = content.trim().length >= 50;
  const isUrlReady = source.trim().length > 0;
  const isFileReady = Boolean(selectedFile);
  const isActionDisabled = mode === 'file' ? !isFileReady : mode === 'url' ? !isUrlReady : !isTextReady;
  const readyState = getReadyStateLabel(mode, selectedFile, source, content);
  const feedback = feedbackState ?? getDefaultFeedback(mode, selectedFile, source, content);
  const handleTitleChange = (value: string) => {
    setFeedbackState(null);
    setTitle(value);
  };
  const handleSourceChange = (value: string) => {
    setFeedbackState(null);
    setSource(value);
  };
  const handleContentChange = (value: string) => {
    setFeedbackState(null);
    setContent(value);
  };

  const resetAndRedirect = () => {
    setTitle('');
    setSource('');
    setContent('');
    setSelectedFile(null);
    setDragActive(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setTimeout(() => {
      router.push('/library');
    }, 1500);
  };

  const handleFileSelect = (file: File) => {
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setFeedbackState({
        tone: 'error',
        eyebrow: 'Unsupported file',
        title: 'This file type is not supported',
        description: `Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      });
      toast.error(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFeedbackState({
        tone: 'error',
        eyebrow: 'File too large',
        title: 'Choose a smaller file',
        description: `The current size limit is ${MAX_FILE_SIZE_MB}MB per upload.`,
      });
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setSelectedFile(file);
    setFeedbackState(null);

    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileSelect(event.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileSelect(event.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setFeedbackState({
        tone: 'error',
        eyebrow: 'Missing file',
        title: 'Select a file before uploading',
        description: 'Choose a supported file from your machine, then try the upload again.',
      });
      toast.error('Please select a file');
      return;
    }

    setIsLoading(true);
    setFeedbackState({
      tone: 'loading',
      eyebrow: 'Uploading',
      title: 'Extracting and saving your file',
      description: 'The vault is parsing the file inline and will take you to the library when it finishes.',
    });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      if (title.trim()) {
        formData.append('title', title.trim());
      }

      const response = await fetch('/api/ingest/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!result.ok) {
        setFeedbackState({
          tone: 'error',
          eyebrow: 'Upload failed',
          title: 'The file could not be imported',
          description: result.error || result.message || 'Upload failed',
        });
        toast.error(result.error || result.message || 'Upload failed');
        return;
      }

      setFeedbackState({
        tone: 'success',
        eyebrow: result.created ? 'Import saved' : 'Already in library',
        title: result.created ? 'File added to the library' : 'Matching content already exists',
        description: result.created
          ? `Extracted ${result.extractedLength.toLocaleString()} characters and queued the document for normal follow-on processing.`
          : 'The vault recognized this content and kept the existing library record instead of creating a duplicate.',
      });
      toast.success(
        result.created
          ? `Content added successfully. Extracted ${result.extractedLength.toLocaleString()} characters.`
          : 'This content is already in the library.',
      );
      resetAndRedirect();
    } catch (error) {
      console.error('Upload error:', error);
      setFeedbackState({
        tone: 'error',
        eyebrow: 'Upload failed',
        title: 'An unexpected upload error occurred',
        description: 'Check the file and try again. If the issue persists, inspect the server logs for the upload route.',
      });
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (mode === 'url') {
      const trimmedSource = source.trim();

      if (!trimmedSource) {
        setFeedbackState({
          tone: 'error',
          eyebrow: 'Missing URL',
          title: 'Paste a public page URL',
          description: 'Paste the page address first so the vault can fetch it inline.',
        });
        toast.error('URL is required');
        return;
      }

      try {
        const parsed = new URL(trimmedSource);

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setFeedbackState({
            tone: 'error',
            eyebrow: 'Invalid URL',
            title: 'Only http and https URLs are supported',
            description: 'Use a public page address that starts with http:// or https://.',
          });
          toast.error('URL must use http or https');
          return;
        }
      } catch {
        setFeedbackState({
          tone: 'error',
          eyebrow: 'Invalid URL',
          title: 'Enter a valid page URL',
          description: 'Use a complete public URL so the vault can fetch the page inline.',
        });
        toast.error('Please enter a valid URL');
        return;
      }
    } else if (!isTextReady) {
      setFeedbackState({
        tone: 'error',
        eyebrow: 'More text needed',
        title: 'Paste at least 50 characters',
        description: 'Short notes do not provide enough signal for tagging and retrieval.',
      });
      toast.error('Content must be at least 50 characters');
      return;
    }

    setIsLoading(true);
    setFeedbackState({
      tone: 'loading',
      eyebrow: mode === 'url' ? 'Importing page' : 'Saving note',
      title: mode === 'url' ? 'Fetching and saving the page' : 'Adding your text to the library',
      description:
        mode === 'url'
          ? 'The vault is extracting the page inline and will open the library when it completes.'
          : 'Your note is being stored as a new library document.',
    });

    try {
      const result = await ingestContent({
        title: title.trim() || undefined,
        source: source.trim() || undefined,
        content: mode === 'url' ? undefined : content.trim(),
      });

      if (!result.success) {
        setFeedbackState({
          tone: 'error',
          eyebrow: 'Import failed',
          title: 'The content could not be saved',
          description: result.error,
        });
        toast.error(result.error);
        return;
      }

      setFeedbackState({
        tone: 'success',
        eyebrow: result.created ? 'Import saved' : 'Already in library',
        title: result.created ? 'Content added to the library' : 'Matching content already exists',
        description: result.created
          ? 'The document was saved successfully. The library will open in a moment.'
          : 'The vault recognized this content and kept the existing library record instead of creating a duplicate.',
      });
      toast.success(result.created ? 'Content added successfully.' : 'This content is already in the library.');
      resetAndRedirect();
    } catch (error) {
      console.error('Ingest error:', error);
      setFeedbackState({
        tone: 'error',
        eyebrow: 'Import failed',
        title: 'An unexpected import error occurred',
        description: 'Try the request again. If the issue persists, inspect the server logs for the ingest action.',
      });
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFeedbackState(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const switchMode = (nextMode: IngestMode) => {
    setMode(nextMode);
    setIsLoading(false);
    setFeedbackState(null);

    if (nextMode !== 'file') {
      setDragActive(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="relative min-h-screen overflow-x-hidden bg-[#131313] text-[#e2e2e2]">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(255,255,255,0.05),transparent_22%),radial-gradient(circle_at_84%_14%,rgba(255,255,255,0.035),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%)]" />

        <TopNav userName={userName} pathname={pathname} />
        <SideNav pathname={pathname} />

        <main className="relative min-h-screen pt-24 pb-14 lg:pl-64">
          <div className="mx-auto max-w-6xl px-6 lg:px-12">
            <header className="mb-12 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className={monoLabelClass}>Add Content</p>
                <h1 className="mt-4 text-[clamp(3.1rem,7vw,5rem)] font-black tracking-[-0.08em] text-white">
                  Bring new material into the vault.
                </h1>
                <p className="mt-4 max-w-2xl text-[1.05rem] leading-8 text-[#c8c1c1]">
                  Use file upload, URL import, or pasted text to create new library documents without leaving the workspace.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
                <div className="rounded-[1.4rem] border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-5 py-4">
                  <p className={monoLabelClass}>Library documents</p>
                  <p className="mt-3 text-[2.7rem] font-black tracking-[-0.08em] text-white">
                    {stats.totalRecords.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-5 py-4">
                  <p className={monoLabelClass}>Needs cleanup</p>
                  <p className="mt-3 text-[2.7rem] font-black tracking-[-0.08em] text-white">
                    {stats.cleanupCandidates.toLocaleString()}
                  </p>
                </div>
              </div>
            </header>

            <div className="animate-workbench-enter">
              <form onSubmit={mode === 'file' ? (event) => event.preventDefault() : handleSubmit}>
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-12 lg:col-span-7">
                    <ModeTabs mode={mode} onSelect={switchMode} />

                    {mode === 'file' && (
                      <FileModePanel
                        dragActive={dragActive}
                        selectedFile={selectedFile}
                        title={title}
                        titlePlaceholder={titlePlaceholder}
                        isLoading={isLoading}
                        isActionDisabled={isActionDisabled}
                        onTitleChange={handleTitleChange}
                        onDrag={handleDrag}
                        onDrop={handleDrop}
                        onOpenFilePicker={() => fileInputRef.current?.click()}
                        onFileInputChange={handleFileInputChange}
                        onClearFile={clearFile}
                        onUpload={handleFileUpload}
                        fileInputRef={fileInputRef}
                      />
                    )}

                    {mode === 'url' && (
                      <UrlModePanel
                        title={title}
                        source={source}
                        titlePlaceholder={titlePlaceholder}
                        isLoading={isLoading}
                        isActionDisabled={isActionDisabled}
                        onTitleChange={handleTitleChange}
                        onSourceChange={handleSourceChange}
                      />
                    )}

                    {mode === 'text' && (
                      <TextModePanel
                        title={title}
                        source={source}
                        content={content}
                        titlePlaceholder={titlePlaceholder}
                        isLoading={isLoading}
                        isActionDisabled={isActionDisabled}
                        onTitleChange={handleTitleChange}
                        onSourceChange={handleSourceChange}
                        onContentChange={handleContentChange}
                      />
                    )}
                  </div>

                  <div className="col-span-12 lg:col-span-5">
                    <StatusCard mode={mode} readyState={readyState} stats={stats} feedback={feedback} />
                  </div>
                </div>
              </form>

              <section className="mt-16">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[2.2rem] font-black tracking-[-0.06em] text-white sm:text-[2.8rem]">
                      Recent imports
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[#a79f9f]">
                      The latest documents already available in the library.
                    </p>
                  </div>
                  <Link
                    href="/library"
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#ddd7d7] transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Open Library
                  </Link>
                </div>

                {recentDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {recentDocuments.map((document) => (
                      <RecentDocumentRow key={document.id} document={document} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] bg-[#101010] px-6 py-10 text-center">
                    <p className={monoLabelClass}>Recent imports</p>
                    <h3 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-white">No content has been added yet.</h3>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#a79f9f]">
                      Use one of the intake modes above to add your first source. Imported content will appear here as soon as extraction completes.
                    </p>
                  </div>
                )}

                <div className="mt-12 flex justify-center">
                  <Link
                    href="/library"
                    className="inline-flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.24em] text-[#b9b0b0] transition hover:text-white"
                  >
                    View all library documents
                    <span aria-hidden="true">⌄</span>
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
