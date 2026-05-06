import type { IngestIconName, IngestMode, ModeConfig } from './types';

export const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.md', '.csv'];

export const MAX_FILE_SIZE_MB = 10;

export const MODE_CONFIG: Record<IngestMode, ModeConfig> = {
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

export const SIDE_NAV_ITEMS: Array<{ href: string; label: string; icon: IngestIconName }> = [
  { href: '/today', label: 'Research', icon: 'brain' },
  { href: '/library', label: 'Library', icon: 'database' },
  { href: '/ingest', label: 'Add Content', icon: 'terminal' },
  { href: '/reports', label: 'Reports', icon: 'network' },
  { href: '/chat', label: 'Ask Vault', icon: 'article' },
];

export const monoLabelClass = 'text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8484]';

export const monoInputClass =
  'w-full rounded-[1.35rem] bg-[#0f0f0f] px-4 py-3.5 text-sm text-[#f1eeee] placeholder:text-[#6f6a6a] outline-none transition duration-200 focus:bg-[#232323] focus:shadow-[0_0_0_1px_rgba(193,193,193,0.14),0_0_0_12px_rgba(119,119,119,0.1)]';

export const monoTextareaClass = `${monoInputClass} min-h-[220px] resize-y font-[450]`;
