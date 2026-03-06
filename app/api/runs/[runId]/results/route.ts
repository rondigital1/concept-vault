import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import { getRunTrace } from '@/server/observability/runTrace.store';
import { listArtifactsByRunId, type ArtifactRow } from '@/server/repos/artifacts.repo';
import { getReportById } from '@/server/repos/report.repo';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function toNumberMap(value: unknown): Record<string, number> | null {
  const record = asObject(value);
  if (!record) {
    return null;
  }

  const entries = Object.entries(record)
    .filter(([, entry]) => typeof entry === 'number' && Number.isFinite(entry))
    .map(([key, entry]) => [key, entry as number]);

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries);
}

function extractPipelineOutput(trace: Awaited<ReturnType<typeof getRunTrace>>): Record<string, unknown> | null {
  if (!trace) {
    return null;
  }

  for (let i = trace.steps.length - 1; i >= 0; i -= 1) {
    const step = trace.steps[i];
    if (step.name !== 'pipeline' || step.status !== 'ok') {
      continue;
    }

    const output = asObject(step.output);
    if (output) {
      return output;
    }
  }

  return null;
}

function extractErrorMessages(
  trace: NonNullable<Awaited<ReturnType<typeof getRunTrace>>>,
  pipelineOutput: Record<string, unknown> | null,
): string[] {
  const fromOutput = pipelineOutput?.errors;
  if (Array.isArray(fromOutput)) {
    const messages = fromOutput
      .map((entry) => {
        const record = asObject(entry);
        if (!record) {
          return null;
        }
        return readString(record.message);
      })
      .filter((entry): entry is string => Boolean(entry));

    if (messages.length > 0) {
      return messages;
    }
  }

  return trace.steps
    .filter((step) => step.status === 'error')
    .map((step) => {
      const errorRecord = asObject(step.error);
      return readString(errorRecord?.message) ?? `${step.name} failed`;
    });
}

function selectLatestReportArtifact(artifacts: ArtifactRow[]): ArtifactRow | null {
  for (let i = artifacts.length - 1; i >= 0; i -= 1) {
    const artifact = artifacts[i];
    if (artifact.kind === 'research-report') {
      return artifact;
    }
  }

  return null;
}

function buildReportPayload(artifact: ArtifactRow, notionPageId: string | null) {
  const content = asObject(artifact.content);
  const markdown = readString(content?.markdown);
  const executiveSummary = readString(content?.executiveSummary);

  return {
    id: artifact.id,
    title: readString(content?.title) ?? artifact.title,
    day: artifact.day,
    sourcesCount: readNumber(content?.sourcesCount),
    topicsCovered: Array.isArray(content?.topicsCovered)
      ? content.topicsCovered.filter((topic): topic is string => typeof topic === 'string').slice(0, 8)
      : [],
    preview: executiveSummary
      ? executiveSummary.replace(/\s+/g, ' ').trim().slice(0, 280)
      : markdown
        ? markdown
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 280)
        : null,
    link: `/reports/${artifact.id}`,
    notionPageId,
  };
}

function mapConcept(artifact: ArtifactRow) {
  const content = asObject(artifact.content);

  return {
    id: artifact.id,
    title: artifact.title,
    type: readString(content?.type),
    summary: readString(content?.summary),
    documentTitle: readString(content?.documentTitle),
  };
}

function mapSource(artifact: ArtifactRow) {
  const content = asObject(artifact.content);

  return {
    id: artifact.id,
    title: artifact.title,
    url: readString(content?.url),
    summary: readString(content?.summary),
    relevanceScore: readNumber(content?.relevanceScore),
    contentType: readString(content?.contentType),
    topics: Array.isArray(content?.topics)
      ? content.topics.filter((topic): topic is string => typeof topic === 'string').slice(0, 8)
      : [],
  };
}

function mapFlashcard(artifact: ArtifactRow) {
  const content = asObject(artifact.content);

  return {
    id: artifact.id,
    title: artifact.title,
    format: readString(content?.format),
    front: readString(content?.front),
    back: readString(content?.back),
    documentTitle: readString(content?.documentTitle),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    await ensureSchema(client);
    const { runId } = await params;

    const trace = await getRunTrace(runId);
    if (!trace) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const artifacts = await listArtifactsByRunId(runId);
    const pipelineOutput = extractPipelineOutput(trace);
    const notionPageId = readString(pipelineOutput?.notionPageId);

    let reportArtifact = selectLatestReportArtifact(artifacts);
    if (!reportArtifact) {
      const fallbackReportId = readString(pipelineOutput?.reportId);
      if (fallbackReportId) {
        const fallbackReport = await getReportById(fallbackReportId);
        if (fallbackReport) {
          reportArtifact = fallbackReport;
        }
      }
    }

    const concepts = artifacts.filter((artifact) => artifact.kind === 'concept').map(mapConcept);
    const sources = artifacts.filter((artifact) => artifact.kind === 'web-proposal').map(mapSource);
    const flashcards = artifacts.filter((artifact) => artifact.kind === 'flashcard').map(mapFlashcard);

    return NextResponse.json({
      runId,
      status: trace.status,
      mode: readString(pipelineOutput?.mode),
      counts: toNumberMap(pipelineOutput?.counts),
      errors: extractErrorMessages(trace, pipelineOutput),
      report: reportArtifact ? buildReportPayload(reportArtifact, notionPageId) : null,
      concepts,
      sources,
      flashcards,
    });
  } catch (error) {
    console.error('Error fetching run results:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to fetch run results') },
      { status: 500 },
    );
  }
}
