import { sql } from '@/db';
import type { SourceWatchKind } from '@/db/types';

export interface SourceWatchRow {
  id: string;
  url: string;
  domain: string;
  label: string;
  kind: SourceWatchKind;
  is_active: boolean;
  check_interval_hours: number;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSourceWatchInput {
  url: string;
  domain: string;
  label: string;
  kind: SourceWatchKind;
  isActive?: boolean;
  checkIntervalHours?: number;
}

export interface UpdateSourceWatchInput {
  url?: string;
  domain?: string;
  label?: string;
  kind?: SourceWatchKind;
  isActive?: boolean;
  checkIntervalHours?: number;
}

export async function listSourceWatchItems(): Promise<SourceWatchRow[]> {
  return sql<SourceWatchRow[]>`
    SELECT
      id,
      url,
      domain,
      label,
      kind,
      is_active,
      check_interval_hours,
      last_checked_at,
      created_at,
      updated_at
    FROM source_watchlist
    ORDER BY is_active DESC, updated_at DESC, created_at DESC
  `;
}

export async function createSourceWatchItem(
  input: CreateSourceWatchInput
): Promise<SourceWatchRow> {
  const rows = await sql<SourceWatchRow[]>`
    INSERT INTO source_watchlist (
      url,
      domain,
      label,
      kind,
      is_active,
      check_interval_hours
    )
    VALUES (
      ${input.url},
      ${input.domain},
      ${input.label},
      ${input.kind},
      ${input.isActive ?? true},
      ${input.checkIntervalHours ?? 24}
    )
    RETURNING
      id,
      url,
      domain,
      label,
      kind,
      is_active,
      check_interval_hours,
      last_checked_at,
      created_at,
      updated_at
  `;

  return rows[0];
}

export async function updateSourceWatchItem(
  id: string,
  input: UpdateSourceWatchInput
): Promise<SourceWatchRow | null> {
  const nextUrl = input.url ?? null;
  const nextDomain = input.domain ?? null;
  const nextLabel = input.label ?? null;
  const nextKind = input.kind ?? null;
  const nextIsActive = input.isActive ?? null;
  const nextCheckIntervalHours = input.checkIntervalHours ?? null;

  const rows = await sql<SourceWatchRow[]>`
    UPDATE source_watchlist
    SET
      url = COALESCE(${nextUrl}, url),
      domain = COALESCE(${nextDomain}, domain),
      label = COALESCE(${nextLabel}, label),
      kind = COALESCE(${nextKind}, kind),
      is_active = COALESCE(${nextIsActive}, is_active),
      check_interval_hours = COALESCE(${nextCheckIntervalHours}, check_interval_hours),
      updated_at = now()
    WHERE id = ${id}
    RETURNING
      id,
      url,
      domain,
      label,
      kind,
      is_active,
      check_interval_hours,
      last_checked_at,
      created_at,
      updated_at
  `;

  return rows[0] ?? null;
}

export async function deleteSourceWatchItem(id: string): Promise<boolean> {
  const rows = await sql<Array<{ id: string }>>`
    DELETE FROM source_watchlist
    WHERE id = ${id}
    RETURNING id
  `;

  return rows.length > 0;
}

export async function getDueSourceWatchItems(limit: number): Promise<SourceWatchRow[]> {
  return sql<SourceWatchRow[]>`
    SELECT
      id,
      url,
      domain,
      label,
      kind,
      is_active,
      check_interval_hours,
      last_checked_at,
      created_at,
      updated_at
    FROM source_watchlist
    WHERE
      is_active = true
      AND (
        last_checked_at IS NULL
        OR last_checked_at <= now() - make_interval(hours => check_interval_hours)
      )
    ORDER BY COALESCE(last_checked_at, to_timestamp(0)) ASC, updated_at DESC
    LIMIT ${limit}
  `;
}

export async function markSourceWatchItemsChecked(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  await sql`
    UPDATE source_watchlist
    SET
      last_checked_at = now(),
      updated_at = now()
    WHERE id = ANY(${ids})
  `;
}
