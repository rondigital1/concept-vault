import {
  formatLibraryRelativeDate,
  getSourceDisplay,
} from '@/app/library/documentPresentation';
import { MODE_CONFIG } from './constants';
import type { FeedbackState, IngestIconName, IngestMode, IngestWorkspaceDocument } from './types';

export function getDefaultFeedback(
  mode: IngestMode,
  selectedFile: File | null,
  source: string,
  content: string,
): FeedbackState {
  if (mode === 'file' && !selectedFile) {
    return {
      tone: 'default',
      eyebrow: 'Awaiting file',
      title: 'Choose a file to begin',
      description: 'Upload a document from your machine to create a new library record.',
    };
  }

  if (mode === 'url' && !source.trim()) {
    return {
      tone: 'default',
      eyebrow: 'Awaiting URL',
      title: 'Paste a public page URL',
      description: 'Use URL import when you want the vault to fetch a public article or docs page inline.',
    };
  }

  if (mode === 'text' && content.trim().length < 50) {
    return {
      tone: 'default',
      eyebrow: 'Awaiting text',
      title: 'Paste enough text to save',
      description: 'Manual notes need at least 50 characters so the vault can classify and retrieve them well.',
    };
  }

  return {
    tone: 'default',
    eyebrow: 'Ready',
    title: 'Ready to import',
    description: 'Review the title if needed, then add this content to the library.',
  };
}

export function getUserInitials(userName: string): string {
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);

  return initials || 'U';
}

export function formatModeLabel(mode: IngestMode): string {
  return MODE_CONFIG[mode].label;
}

export function getTitlePlaceholder(mode: IngestMode): string {
  if (mode === 'file') {
    return 'Leave blank to use the filename';
  }

  if (mode === 'url') {
    return 'Leave blank to use the page title';
  }

  return 'Optional title for this note or excerpt';
}

export function getReadyStateLabel(
  mode: IngestMode,
  selectedFile: File | null,
  source: string,
  content: string,
): string {
  if (mode === 'file') {
    return selectedFile ? 'Ready to import' : 'Choose a file';
  }

  if (mode === 'url') {
    return source.trim() ? 'Ready to import' : 'Paste a URL';
  }

  return content.trim().length >= 50 ? 'Ready to import' : 'Paste enough text';
}

export function formatSourceType(source: string, isWebScoutDiscovered: boolean): string {
  if (isWebScoutDiscovered) {
    return 'RESEARCH SOURCE';
  }

  if (/^https?:\/\//i.test(source)) {
    return 'WEB SOURCE';
  }

  return 'DIRECT IMPORT';
}

export function formatDocumentMeta(document: IngestWorkspaceDocument): string {
  const relativeDate = formatLibraryRelativeDate(document.imported_at).toUpperCase();
  return `SAVED ${relativeDate} • ${formatSourceType(document.source, document.is_webscout_discovered)}`;
}

export function getDocumentIconName(source: string): IngestIconName {
  if (/^https?:\/\//i.test(source)) {
    return 'link';
  }

  if (source.toLowerCase().endsWith('.md')) {
    return 'article';
  }

  return 'file';
}

export { getSourceDisplay };
