import type { SourceWatchKind } from '@/db/types';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import {
  createSourceWatchItem,
  deleteSourceWatchItem,
  getDueSourceWatchItems,
  listSourceWatchItems,
  markSourceWatchItemsChecked,
  updateSourceWatchItem,
  type SourceWatchRow,
} from '@/server/repos/sourceWatch.repo';

const SOURCE_WATCH_KINDS: SourceWatchKind[] = ['website', 'blog', 'newsletter', 'source'];

export interface SourceWatchItemDto {
  id: string;
  url: string;
  domain: string;
  label: string;
  kind: SourceWatchKind;
  isActive: boolean;
  checkIntervalHours: number;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSourceWatchInput {
  url: string;
  label?: string;
  kind?: string;
  isActive?: boolean;
  checkIntervalHours?: number;
}

export interface UpdateSourceWatchInput {
  url?: string;
  label?: string;
  kind?: string;
  isActive?: boolean;
  checkIntervalHours?: number;
}

function toDto(row: SourceWatchRow): SourceWatchItemDto {
  return {
    id: row.id,
    url: row.url,
    domain: row.domain,
    label: row.label,
    kind: row.kind,
    isActive: row.is_active,
    checkIntervalHours: row.check_interval_hours,
    lastCheckedAt: row.last_checked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeUrl(rawUrl: string): { url: string; domain: string } {
  const parsed = new URL(rawUrl.trim());

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL must start with http:// or https://');
  }

  parsed.hash = '';
  parsed.search = '';
  parsed.username = '';
  parsed.password = '';

  let pathname = parsed.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  const normalizedUrl = `${parsed.protocol}//${parsed.host}${pathname || '/'}`;
  const domain = parsed.hostname.replace(/^www\./i, '').toLowerCase();

  return { url: normalizedUrl, domain };
}

function normalizeKind(kind: unknown): SourceWatchKind {
  if (typeof kind !== 'string') {
    return 'source';
  }

  const lower = kind.toLowerCase() as SourceWatchKind;
  if (SOURCE_WATCH_KINDS.includes(lower)) {
    return lower;
  }

  return 'source';
}

function normalizeLabel(rawLabel: unknown, fallbackDomain: string): string {
  if (typeof rawLabel !== 'string') {
    return fallbackDomain;
  }

  const trimmed = rawLabel.trim();
  if (!trimmed) {
    return fallbackDomain;
  }

  return trimmed.slice(0, 120);
}

function normalizeIntervalHours(input: unknown, fallback: number): number {
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    return fallback;
  }

  return Math.max(1, Math.min(168, Math.round(input)));
}

export async function listSourceWatch(scope: WorkspaceScope): Promise<SourceWatchItemDto[]> {
  const rows = await listSourceWatchItems(scope);
  return rows.map(toDto);
}

export async function createSourceWatch(
  scope: WorkspaceScope,
  input: CreateSourceWatchInput,
): Promise<SourceWatchItemDto> {
  const { url, domain } = normalizeUrl(input.url);
  const checkIntervalHours = normalizeIntervalHours(input.checkIntervalHours, 24);
  const kind = normalizeKind(input.kind);
  const label = normalizeLabel(input.label, domain);

  const row = await createSourceWatchItem({
    workspaceId: scope.workspaceId,
    url,
    domain,
    label,
    kind,
    isActive: input.isActive ?? true,
    checkIntervalHours,
  });

  return toDto(row);
}

export async function updateSourceWatch(
  scope: WorkspaceScope,
  id: string,
  input: UpdateSourceWatchInput
): Promise<SourceWatchItemDto | null> {
  let normalizedUrl: string | undefined;
  let normalizedDomain: string | undefined;
  let labelFromUrl: string | undefined;

  if (typeof input.url === 'string') {
    const normalized = normalizeUrl(input.url);
    normalizedUrl = normalized.url;
    normalizedDomain = normalized.domain;
    labelFromUrl = normalized.domain;
  }

  const normalizedLabel =
    typeof input.label === 'string'
      ? normalizeLabel(input.label, labelFromUrl ?? '').trim()
      : undefined;

  const row = await updateSourceWatchItem(scope, id, {
    url: normalizedUrl,
    domain: normalizedDomain,
    label: normalizedLabel || undefined,
    kind: input.kind ? normalizeKind(input.kind) : undefined,
    isActive: typeof input.isActive === 'boolean' ? input.isActive : undefined,
    checkIntervalHours:
      input.checkIntervalHours == null
        ? undefined
        : normalizeIntervalHours(input.checkIntervalHours, 24),
  });

  return row ? toDto(row) : null;
}

export async function deleteSourceWatch(scope: WorkspaceScope, id: string): Promise<boolean> {
  return deleteSourceWatchItem(scope, id);
}

export async function checkoutDueSources(
  scope: WorkspaceScope,
  limit = 8,
): Promise<SourceWatchItemDto[]> {
  const rows = await getDueSourceWatchItems(scope, limit);
  if (rows.length === 0) {
    return [];
  }

  await markSourceWatchItemsChecked(scope, rows.map((row) => row.id));
  return rows.map(toDto);
}
