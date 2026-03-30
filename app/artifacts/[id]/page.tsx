import Link from 'next/link';
import { notFound } from 'next/navigation';
import { client, ensureSchema } from '@/db';
import { getArtifactById, type ArtifactRow } from '@/server/repos/artifacts.repo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageSearchParams = Record<string, string | string[] | undefined>;

function firstQueryParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

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

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => entry.trim());
}

function readSourceDocumentId(sourceRefs: unknown): string | null {
  const record = asObject(sourceRefs);
  if (!record) {
    return null;
  }

  return readString(record.documentId) ?? readString(record.document_id);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? '');
  }
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatusLabel(status: ArtifactRow['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    'web-proposal': 'Source Candidate',
    concept: 'Concept',
    flashcard: 'Flashcard',
    'research-report': 'Report',
  };

  return labels[kind] ?? kind.replace(/[_-]+/g, ' ');
}

function statusTheme(status: ArtifactRow['status']): string {
  const themes: Record<ArtifactRow['status'], string> = {
    proposed: 'border-amber-800 bg-amber-950 text-amber-200',
    approved: 'border-emerald-800 bg-emerald-950 text-emerald-200',
    rejected: 'border-zinc-700 bg-zinc-900 text-zinc-300',
    superseded: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  };

  return themes[status];
}

function kindTheme(kind: string): string {
  const themes: Record<string, string> = {
    'web-proposal': 'border-sky-800 bg-sky-950 text-sky-200',
    concept: 'border-emerald-800 bg-emerald-950 text-emerald-200',
    flashcard: 'border-amber-800 bg-amber-950 text-amber-200',
    'research-report': 'border-rose-800 bg-rose-950 text-rose-200',
  };

  return themes[kind] ?? 'border-zinc-700 bg-zinc-900 text-zinc-300';
}

function buildSummaryPreview(markdown: string | null): string | null {
  if (!markdown) {
    return null;
  }

  const preview = markdown.replace(/\s+/g, ' ').trim().slice(0, 360);
  return preview || null;
}

function renderArtifactSummary(args: {
  artifact: ArtifactRow;
  content: Record<string, unknown>;
  sourceDocumentId: string | null;
}) {
  const { artifact, content, sourceDocumentId } = args;
  const summary = readString(content.summary);
  const topics = readStringArray(content.topics).slice(0, 8);
  const reasoning = readStringArray(content.reasoning).slice(0, 5);
  const evidence = readStringArray(content.evidence).slice(0, 4);
  const sourceUrl = readString(content.url);

  if (artifact.kind === 'research-report') {
    const executiveSummary = readString(content.executiveSummary);
    const markdownPreview = buildSummaryPreview(readString(content.markdown));
    const topicsCovered = readStringArray(content.topicsCovered).slice(0, 8);
    const sourcesCount = readNumber(content.sourcesCount);

    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Summary</h2>
        <p className="mt-3 text-sm text-zinc-300">
          Use the report view for reading and sharing. This page keeps the report context and technical payload together in one place.
        </p>
        {(executiveSummary || markdownPreview) && (
          <p className="mt-4 text-sm leading-7 text-zinc-100">
            {executiveSummary ?? markdownPreview}
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Sources Used</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {typeof sourcesCount === 'number' ? sourcesCount : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Topics Covered</p>
            <p className="mt-2 text-sm text-zinc-100">
              {topicsCovered.length > 0 ? topicsCovered.join(', ') : 'No topics listed'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (artifact.kind === 'web-proposal') {
    const relevanceScore = readNumber(content.relevanceScore);
    const contentType = readString(content.contentType);

    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Summary</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-100">
          {summary ?? 'No summary was saved for this source candidate.'}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Source</p>
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm text-blue-300 underline decoration-blue-400 underline-offset-2 break-all hover:text-blue-200"
              >
                {sourceUrl}
              </a>
            ) : (
              <p className="mt-2 text-sm text-zinc-300">No source URL saved</p>
            )}
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Why It Matters</p>
            <p className="mt-2 text-sm text-zinc-100">
              {typeof relevanceScore === 'number'
                ? `Relevance score ${relevanceScore.toFixed(2)}${contentType ? ` · ${contentType}` : ''}`
                : contentType ?? 'No relevance details saved'}
            </p>
          </div>
        </div>
        {topics.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Topics</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
        {reasoning.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Why It Was Proposed</p>
            <ul className="mt-2 space-y-2 text-sm text-zinc-300">
              {reasoning.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>
        )}
        {artifact.status === 'approved' && sourceDocumentId && (
          <p className="mt-4 text-sm text-emerald-200">
            This source has already been added to Library.
          </p>
        )}
      </section>
    );
  }

  if (artifact.kind === 'concept') {
    const type = readString(content.type);
    const documentTitle = readString(content.documentTitle);

    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Summary</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-100">
          {summary ?? 'No concept summary was saved for this item.'}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Type</p>
            <p className="mt-2 text-sm text-zinc-100">{type ?? 'Concept'}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">From Document</p>
            <p className="mt-2 text-sm text-zinc-100">{documentTitle ?? 'Unknown document'}</p>
          </div>
        </div>
        {evidence.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Supporting Evidence</p>
            <ul className="mt-2 space-y-2 text-sm text-zinc-300">
              {evidence.map((entry) => (
                <li key={entry} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  {entry}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  if (artifact.kind === 'flashcard') {
    const format = readString(content.format);
    const front = readString(content.front);
    const back = readString(content.back);
    const documentTitle = readString(content.documentTitle);

    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Summary</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Prompt</p>
            <p className="mt-3 text-sm leading-7 text-zinc-100">
              {front ?? artifact.title}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Answer</p>
            <p className="mt-3 text-sm leading-7 text-zinc-100">
              {back ?? 'No answer was saved for this flashcard.'}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-zinc-300">
          {format ?? 'Flashcard'}
          {documentTitle ? ` · From ${documentTitle}` : ''}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Summary</h2>
      <p className="mt-3 text-sm text-zinc-300">
        This item does not have a specialized summary view yet. Technical details remain available below.
      </p>
    </section>
  );
}

export default async function ArtifactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const artifactActionError = firstQueryParam(resolvedSearchParams.artifactActionError);
  const artifactActionInfo = firstQueryParam(resolvedSearchParams.artifactActionInfo);
  const { id } = await params;

  const schemaResult = await ensureSchema(client);
  if (!schemaResult.ok) {
    throw new Error(schemaResult.error || 'Failed to initialize database');
  }

  const artifact = await getArtifactById(id);
  if (!artifact) {
    notFound();
  }

  const content = asObject(artifact.content) ?? {};
  const sourceRefs = asObject(artifact.source_refs) ?? {};
  const sourceDocumentId = readSourceDocumentId(sourceRefs);
  const sourceUrl = readString(content.url);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Item Summary</p>
            <h1 className="mt-2 text-3xl font-bold text-white break-words">{artifact.title}</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-300">
              This page keeps the item readable for review. Technical payloads and raw JSON are still available in the Technical Details section below.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTheme(artifact.status)}`}>
                {formatStatusLabel(artifact.status)}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${kindTheme(artifact.kind)}`}>
                {formatKindLabel(artifact.kind)}
              </span>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                Created {formatDateTime(artifact.created_at)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {artifact.kind === 'research-report' && (
              <Link
                href={`/reports/${artifact.id}`}
                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
              >
                Open Report
              </Link>
            )}
            {sourceDocumentId && artifact.kind === 'web-proposal' && (
              <Link
                href={`/library/${sourceDocumentId}`}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Open in Library
              </Link>
            )}
            {!sourceDocumentId && sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Open Source
              </a>
            )}
            <Link
              href="/today"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Back to Research
            </Link>
          </div>
        </header>

        {artifactActionError && (
          <div className="rounded-xl border border-rose-700 bg-rose-950 px-4 py-3 text-sm text-rose-100">
            {artifactActionError}
          </div>
        )}
        {!artifactActionError && artifactActionInfo && (
          <div className="rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-3 text-sm text-emerald-100">
            {artifactActionInfo}
          </div>
        )}

        {artifact.status === 'proposed' && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Review Actions</h2>
            <p className="mt-3 text-sm text-zinc-300">
              Review this item here, or return to Research to continue the broader queue.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <form action={`/api/artifacts/${artifact.id}/approve`} method="POST">
                <button
                  type="submit"
                  className="rounded-lg border border-green-800 bg-green-950 px-4 py-2 text-sm font-medium text-green-300 hover:bg-green-900 transition-colors"
                >
                  {artifact.kind === 'web-proposal' ? 'Save Source' : 'Approve'}
                </button>
              </form>
              <form action={`/api/artifacts/${artifact.id}/reject`} method="POST">
                <button
                  type="submit"
                  className="rounded-lg border border-red-800 bg-red-950 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900 transition-colors"
                >
                  {artifact.kind === 'web-proposal' ? 'Dismiss' : 'Reject'}
                </button>
              </form>
            </div>
          </section>
        )}

        {renderArtifactSummary({
          artifact,
          content,
          sourceDocumentId,
        })}

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Context</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <dt className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Day</dt>
              <dd className="mt-2 text-sm text-zinc-100">{artifact.day}</dd>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <dt className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Agent</dt>
              <dd className="mt-2 text-sm text-zinc-100">{artifact.agent}</dd>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <dt className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Reviewed</dt>
              <dd className="mt-2 text-sm text-zinc-100">{formatDateTime(artifact.reviewed_at)}</dd>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <dt className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Run</dt>
              <dd className="mt-2 text-sm text-zinc-100">{artifact.run_id ?? 'No run linked'}</dd>
            </div>
          </dl>
        </section>

        <details
          id="technical-details"
          className="rounded-xl border border-zinc-800 bg-zinc-900"
        >
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-300 hover:text-white transition-colors">
            Technical Details
          </summary>
          <div className="border-t border-zinc-800 p-5 space-y-5">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Metadata</h2>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-zinc-500">ID:</dt>
                  <dd className="text-zinc-300 font-mono break-all">{artifact.id}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Run ID:</dt>
                  <dd className="text-zinc-300 font-mono break-all">{artifact.run_id ?? '—'}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Created:</dt>
                  <dd className="text-zinc-300">{formatDateTime(artifact.created_at)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Read:</dt>
                  <dd className="text-zinc-300">{formatDateTime(artifact.read_at)}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Content Payload</h2>
              <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200">
                {safeJson(artifact.content)}
              </pre>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Source Refs</h2>
              <pre className="mt-3 max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200">
                {safeJson(artifact.source_refs)}
              </pre>
            </section>
          </div>
        </details>
      </div>
    </main>
  );
}
