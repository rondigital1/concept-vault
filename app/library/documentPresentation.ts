export type DocumentTitleIssue = {
  label: string;
  reason: string;
};

export type DocumentFormatBucket = 'pdf' | 'text' | 'web';

export const DOCUMENT_FORMAT_LABELS: Record<DocumentFormatBucket, string> = {
  pdf: 'PDF Document',
  text: 'Text Note',
  web: 'Web Archive',
};

type FormatCandidate = {
  source: string;
  title: string;
};

type SearchCandidate = FormatCandidate & {
  tags: string[];
};

const HTML_METADATA_PATTERN =
  /<meta|<\/?[a-z][^>]*>|name=["'][^"']+["']|content=["'][^"']*["']|http-equiv=["'][^"']+["']/i;

const URL_LIKE_PATTERN = /(https?:\/\/|www\.)/i;

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function getSourceDisplay(source: string): string {
  try {
    const url = new URL(source);
    return url.hostname.replace('www.', '');
  } catch {
    return source;
  }
}

export function formatLibraryRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfImportedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfImportedDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays >= 30 && diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  if (diffDays < 0 && diffDays >= -1) return 'Today';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatLibraryFullDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function getDocumentOriginLabel(isWebScoutDiscovered: boolean): string {
  return isWebScoutDiscovered ? 'Saved from research' : 'Added directly';
}

export function inferDocumentFormatBucket(document: FormatCandidate): DocumentFormatBucket {
  const source = document.source.toLowerCase();
  const title = document.title.toLowerCase();

  if (source.endsWith('.pdf') || title.endsWith('.pdf')) {
    return 'pdf';
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    return 'web';
  }

  return 'text';
}

export function buildDocumentPreview(content: string): string {
  const normalized = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return 'Open this record to inspect the full source, review its tags, and continue working from the saved material.';
  }

  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

export function matchesLibrarySearch(document: SearchCandidate, query: string): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    document.title,
    document.source,
    ...document.tags,
  ]
    .map(normalizeSearchValue)
    .join(' ');

  return normalizedQuery.split(/\s+/).every((term) => haystack.includes(term));
}

export function getDocumentTitleIssue(title: string): DocumentTitleIssue | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return {
      label: 'Add a readable title',
      reason: 'This document is missing a clear title. Rename it so it is easy to find later.',
    };
  }

  if (HTML_METADATA_PATTERN.test(trimmed)) {
    return {
      label: 'Imported metadata leaked into the title',
      reason: 'Rename this document so the library shows a short, readable title instead of raw page metadata.',
    };
  }

  if (trimmed.length > 120) {
    return {
      label: 'Title is too long to scan quickly',
      reason: 'Shorten this title to the core idea so it is easier to browse and search.',
    };
  }

  if (URL_LIKE_PATTERN.test(trimmed) && trimmed.length > 80) {
    return {
      label: 'Title looks like a pasted URL',
      reason: 'Replace the raw link text with a descriptive title that explains what this document is about.',
    };
  }

  return null;
}
