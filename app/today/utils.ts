import type { SavedTopicRow } from '@/server/repos/savedTopics.repo';
import type { Artifact, ReportReadyTopic } from './types';

export function firstQueryParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

export function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

export function formatTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) {
    return 'No report generated yet';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return 'No report generated yet';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDisplayDate(isoDate: string): string {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return isoDate;
  }

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function artifactDetailHref(item: Artifact): string {
  if (item.kind === 'research-report') {
    return `/reports/${item.id}`;
  }
  return `/artifacts/${item.id}`;
}

export function artifactPrimaryHref(item: Artifact): string {
  if (item.kind === 'research-report') {
    return `/reports/${item.id}`;
  }
  if (item.kind === 'web-proposal' && item.sourceDocumentId) {
    return `/library/${item.sourceDocumentId}`;
  }
  return `/artifacts/${item.id}`;
}

export function artifactPrimaryLabel(item: Artifact): string {
  if (item.kind === 'research-report') {
    return 'Open report';
  }
  if (item.kind === 'web-proposal' && item.sourceDocumentId) {
    return 'Open in Library';
  }
  return 'View technical details';
}

export function readTopicIdFromArtifact(item: Artifact): string | null {
  return readString(item.sourceRefs?.topicId);
}

export function readLinkedDocumentCount(topic: SavedTopicRow, reportReadyTopic?: ReportReadyTopic): number {
  if (reportReadyTopic) {
    return reportReadyTopic.linkedDocumentCount;
  }
  const metadata = asObject(topic.metadata);
  return readNumber(metadata?.linkedDocumentCount) ?? 0;
}

export function formatRunLabel(kind: string): string {
  const labels: Record<string, string> = {
    full_report: 'Generate report',
    incremental_update: 'Refresh topic',
    scout_only: 'Find sources',
    concept_only: 'Extract concepts',
    pipeline: 'Pipeline run',
  };
  return labels[kind] ?? formatTitleCase(kind);
}
