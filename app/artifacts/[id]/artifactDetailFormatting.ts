import type { ArtifactRow } from '@/server/repos/artifacts.repo';

export type PageSearchParams = Record<string, string | string[] | undefined>;

export function firstQueryParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

export function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? '');
  }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) {
    return '—';
  }

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatStatusLabel(status: ArtifactRow['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    'web-proposal': 'Source Candidate',
    concept: 'Concept',
    flashcard: 'Flashcard',
    'research-report': 'Report',
  };

  return labels[kind] ?? kind.replace(/[_-]+/g, ' ');
}

export function statusTone(status: ArtifactRow['status']): 'success' | 'warning' | 'muted' {
  if (status === 'approved') {
    return 'success';
  }
  if (status === 'proposed') {
    return 'warning';
  }
  return 'muted';
}

export function kindTone(kind: string): 'info' | 'success' | 'warning' | 'muted' {
  if (kind === 'research-report') {
    return 'info';
  }
  if (kind === 'web-proposal') {
    return 'warning';
  }
  if (kind === 'concept') {
    return 'success';
  }
  return 'muted';
}
