import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { todayISODate } from '@/server/services/todayDate';
import type {
  EvidenceReviewView,
  ResearchArtifact,
  ResearchRun,
  ResearchStep,
  ResearchView,
} from '@/server/services/today.types';

type ArtifactStatusRow = 'proposed' | 'approved' | 'rejected' | 'superseded';

type ArtifactRow = {
  id: string;
  run_id: string | null;
  agent: string;
  kind: string;
  day: string;
  title: string;
  content: Record<string, unknown>;
  source_refs: Record<string, unknown>;
  status: ArtifactStatusRow;
  created_at: string;
};

type RunRow = {
  id: string;
  kind: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown>;
};

type StepRow = {
  run_id: string;
  step_name: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  started_at: string;
  ended_at: string | null;
  error: unknown;
};

function asShortPreview(content: unknown, kind: string): string | undefined {
  if (!content || typeof content !== 'object') {
    return undefined;
  }

  const record = content as Record<string, unknown>;
  const candidates: unknown[] = [
    record.summary,
    record.executiveSummary,
    record.fact,
    record.front,
    record.back,
  ];

  if (kind === 'web-proposal' && typeof record.url === 'string' && record.url.trim()) {
    return record.url.trim().slice(0, 180);
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.replace(/\s+/g, ' ').trim().slice(0, 220);
    }
  }

  return undefined;
}

function asHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function readSourceDocumentId(sourceRefs: Record<string, unknown>): string | undefined {
  const directCandidates = [sourceRefs.documentId, sourceRefs.document_id];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  const pluralCandidates = [sourceRefs.documentIds, sourceRefs.document_ids];
  for (const candidate of pluralCandidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const firstString = candidate.find((value) => typeof value === 'string' && value.trim());
    if (typeof firstString === 'string') {
      return firstString.trim();
    }
  }

  return undefined;
}

function resolveArtifactSourceUrl(params: {
  content: Record<string, unknown>;
  sourceRefs: Record<string, unknown>;
  sourceDocumentId?: string;
  documentSourceById: Map<string, string>;
}): string | undefined {
  const inlineUrlCandidates = [params.content.url, params.sourceRefs.url, params.sourceRefs.source];

  for (const candidate of inlineUrlCandidates) {
    const url = asHttpUrl(candidate);
    if (url) {
      return url;
    }
  }

  if (!params.sourceDocumentId) {
    return undefined;
  }

  return asHttpUrl(params.documentSourceById.get(params.sourceDocumentId));
}

function toErrorText(error: unknown): string | undefined {
  if (!error) {
    return undefined;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') {
      return record.message;
    }
  }

  return undefined;
}

function toArtifactStatus(
  status: ArtifactStatusRow,
  mapApprovedToActive = false,
): ResearchArtifact['status'] {
  if (status === 'superseded') {
    return 'rejected';
  }
  if (status === 'approved' && mapApprovedToActive) {
    return 'active';
  }

  return status;
}

function readRunMetadata(metadata: Record<string, unknown>): ResearchRun['metadata'] {
  return {
    topicId:
      typeof metadata?.topicId === 'string' && metadata.topicId.trim().length > 0
        ? metadata.topicId.trim()
        : null,
    runMode:
      typeof metadata?.runMode === 'string' && metadata.runMode.trim().length > 0
        ? metadata.runMode.trim()
        : null,
  };
}

async function listArtifactsByStatus(scope: WorkspaceScope, status: 'proposed' | 'approved'): Promise<ArtifactRow[]> {
  if (status === 'proposed') {
    return sql<ArtifactRow[]>`
      SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at
      FROM artifacts
      WHERE workspace_id = ${scope.workspaceId}
        AND status = 'proposed'
      ORDER BY created_at DESC
    `;
  }

  return sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at
    FROM artifacts
    WHERE workspace_id = ${scope.workspaceId}
      AND status = 'approved'
    ORDER BY COALESCE(reviewed_at, created_at) DESC
  `;
}

async function listRecentRuns(scope: WorkspaceScope): Promise<RunRow[]> {
  return sql<RunRow[]>`
    SELECT id, kind, status, started_at, ended_at, metadata
    FROM runs
    WHERE workspace_id = ${scope.workspaceId}
    ORDER BY started_at DESC
    LIMIT 12
  `;
}

async function listResearchSteps(runIds: string[]): Promise<StepRow[]> {
  if (runIds.length === 0) {
    return [];
  }

  return sql<StepRow[]>`
    SELECT run_id, step_name, status, started_at, ended_at, error
    FROM run_steps
    WHERE run_id = ANY(${runIds})
      AND (
        step_name = 'pipeline'
        OR step_name LIKE 'pipeline_%'
        OR step_name IN ('curator_start', 'curator_complete', 'webscout_start', 'webscout_complete', 'distiller_start', 'distiller_complete')
      )
    ORDER BY started_at ASC
  `;
}

async function listDocumentSources(
  scope: WorkspaceScope,
  artifacts: ArtifactRow[],
): Promise<Map<string, string>> {
  const documentIds = new Set<string>();

  for (const artifact of artifacts) {
    const documentId = readSourceDocumentId(artifact.source_refs ?? {});
    if (documentId) {
      documentIds.add(documentId);
    }
  }

  if (documentIds.size === 0) {
    return new Map();
  }

  const rows = await sql<Array<{ id: string; source: string }>>`
    SELECT id, source
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ANY(${Array.from(documentIds)})
  `;
  const sourceById = new Map<string, string>();

  for (const row of rows) {
    if (typeof row.source === 'string' && row.source.trim()) {
      sourceById.set(row.id, row.source.trim());
    }
  }

  return sourceById;
}

function groupStepsByRun(stepRows: StepRow[]): Map<string, ResearchStep[]> {
  const stepsByRun = new Map<string, ResearchStep[]>();

  for (const row of stepRows) {
    const existing = stepsByRun.get(row.run_id) ?? [];
    if (existing.length >= 40) {
      continue;
    }

    existing.push({
      name: row.step_name,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at ?? undefined,
      error: toErrorText(row.error),
    });
    stepsByRun.set(row.run_id, existing);
  }

  return stepsByRun;
}

function mapArtifact(
  artifact: ArtifactRow,
  documentSourceById: Map<string, string>,
  mapApprovedToActive = false,
): ResearchArtifact {
  const sourceDocumentId = readSourceDocumentId(artifact.source_refs ?? {});

  return {
    id: artifact.id,
    runId: artifact.run_id,
    day: artifact.day,
    agent: artifact.agent,
    kind: artifact.kind,
    status: toArtifactStatus(artifact.status, mapApprovedToActive),
    title: artifact.title,
    preview: asShortPreview(artifact.content, artifact.kind),
    createdAt: artifact.created_at,
    sourceDocumentId,
    sourceUrl: resolveArtifactSourceUrl({
      content: artifact.content ?? {},
      sourceRefs: artifact.source_refs ?? {},
      sourceDocumentId,
      documentSourceById,
    }),
    sourceRefs: artifact.source_refs,
    content: artifact.content,
  };
}

function mapRun(row: RunRow, stepsByRun?: Map<string, ResearchStep[]>): ResearchRun {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    metadata: readRunMetadata(row.metadata ?? {}),
    steps: stepsByRun?.get(row.id) ?? [],
  };
}

export async function getResearchView(scope: WorkspaceScope): Promise<ResearchView> {
  const date = todayISODate();
  const [inboxRows, activeRows, runRows] = await Promise.all([
    listArtifactsByStatus(scope, 'proposed'),
    listArtifactsByStatus(scope, 'approved'),
    listRecentRuns(scope),
  ]);
  const runIds = runRows.map((run) => run.id);
  const [stepRows, documentSourceById] = await Promise.all([
    listResearchSteps(runIds),
    listDocumentSources(scope, [...inboxRows, ...activeRows]),
  ]);
  const stepsByRun = groupStepsByRun(stepRows);

  return {
    date,
    runs: runRows.map((run) => mapRun(run, stepsByRun)),
    inbox: inboxRows.map((artifact) => mapArtifact(artifact, documentSourceById)),
    active: activeRows.map((artifact) => mapArtifact(artifact, documentSourceById, true)),
  };
}

export async function getEvidenceReviewView(scope: WorkspaceScope): Promise<EvidenceReviewView> {
  const date = todayISODate();
  const [inboxRows, activeRows, runRows] = await Promise.all([
    listArtifactsByStatus(scope, 'proposed'),
    listArtifactsByStatus(scope, 'approved'),
    listRecentRuns(scope),
  ]);
  const documentSourceById = await listDocumentSources(scope, [...inboxRows, ...activeRows]);

  return {
    date,
    runs: runRows.map((run) => {
      const mapped = mapRun(run);
      return {
        id: mapped.id,
        kind: mapped.kind,
        status: mapped.status,
        startedAt: mapped.startedAt,
        endedAt: mapped.endedAt,
        metadata: mapped.metadata,
      };
    }),
    inbox: inboxRows.map((artifact) => mapArtifact(artifact, documentSourceById)),
    active: activeRows.map((artifact) => mapArtifact(artifact, documentSourceById, true)),
  };
}
