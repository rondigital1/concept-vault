import Link from 'next/link';
import { notFound } from 'next/navigation';
import { client, ensureSchema } from '@/db';
import { getArtifactById } from '@/server/repos/artifacts.repo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const schemaResult = await ensureSchema(client);
  if (!schemaResult.ok) {
    throw new Error(schemaResult.error || 'Failed to initialize database');
  }

  const artifact = await getArtifactById(id);
  if (!artifact) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Artifact Detail</p>
            <h1 className="text-2xl font-bold text-white break-words">{artifact.title}</h1>
            <p className="text-sm text-zinc-400 mt-2">
              {artifact.agent} · {artifact.kind} · {artifact.status}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {artifact.kind === 'research-report' && (
              <Link
                href={`/reports/${artifact.id}`}
                className="px-3 py-1.5 text-sm text-zinc-200 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Open Report View
              </Link>
            )}
            <Link
              href="/agent-control-center"
              className="px-3 py-1.5 text-sm text-zinc-200 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Back
            </Link>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">Metadata</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-zinc-500">ID:</dt>
              <dd className="text-zinc-300 font-mono break-all">{artifact.id}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-zinc-500">Run ID:</dt>
              <dd className="text-zinc-300 font-mono break-all">{artifact.run_id ?? '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-zinc-500">Day:</dt>
              <dd className="text-zinc-300">{artifact.day}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-zinc-500">Created:</dt>
              <dd className="text-zinc-300">{formatDateTime(artifact.created_at)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-zinc-500">Reviewed:</dt>
              <dd className="text-zinc-300">{formatDateTime(artifact.reviewed_at)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-zinc-500">Read:</dt>
              <dd className="text-zinc-300">{formatDateTime(artifact.read_at)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">Content</h2>
          <pre className="text-xs text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-auto max-h-[460px] whitespace-pre-wrap break-words">
            {safeJson(artifact.content)}
          </pre>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">Source Refs</h2>
          <pre className="text-xs text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-auto max-h-[360px] whitespace-pre-wrap break-words">
            {safeJson(artifact.source_refs)}
          </pre>
        </section>
      </div>
    </main>
  );
}
