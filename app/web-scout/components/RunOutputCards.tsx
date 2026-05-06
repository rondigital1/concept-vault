import Link from 'next/link';
import {
  primaryButtonClass,
  sectionLabelClass,
} from '@/app/today/WorkspaceHeaderPrimitives';
import {
  insetPanelClass,
  surfacePanelClass,
} from '../styles';
import type {
  GeneratedConcept,
  GeneratedFlashcard,
  GeneratedReport,
  GeneratedSource,
} from '../types';

export function ReportOutputCard({ report }: { report: GeneratedReport }) {
  return (
    <article className={`${surfacePanelClass} p-4`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={sectionLabelClass}>Report ready</p>
          <h3 className="mt-1 text-lg font-semibold text-[color:var(--today-text)]">{report.title}</h3>
          <p className="mt-1 text-xs text-[color:var(--today-muted)]">
            Day {report.day}
            {typeof report.sourcesCount === 'number'
              ? ` · ${report.sourcesCount} source${report.sourcesCount === 1 ? '' : 's'}`
              : ''}
          </p>
          {report.topicsCovered.length > 0 && (
            <p className="mt-2 text-xs text-[color:var(--today-text-soft)]">
              Covers: {report.topicsCovered.slice(0, 5).join(', ')}
            </p>
          )}
          {report.preview && (
            <p className="mt-2 text-sm text-[color:var(--today-text-soft)] line-clamp-4">{report.preview}</p>
          )}
        </div>
        <Link
          href={report.link}
          className={primaryButtonClass}
        >
          Open Report
        </Link>
      </div>
    </article>
  );
}

export function SourceCandidatesCard({
  sources,
  sourceCount,
}: {
  sources: GeneratedSource[];
  sourceCount: number;
}) {
  return (
    <article className={`${surfacePanelClass} p-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Source candidates</h3>
        <span className="text-xs text-[color:var(--today-muted)]">{sourceCount}</span>
      </div>
      <p className="mt-2 text-sm text-[color:var(--today-muted)]">
        These sources were proposed by this run and are waiting in the review queue.
      </p>
      <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
        {sources.map((source) => (
          <div key={source.id} className={`${insetPanelClass} p-3`}>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="break-words text-sm font-medium text-[color:var(--today-accent-strong)] hover:underline"
              >
                {source.title}
              </a>
            ) : (
              <p className="text-sm font-medium text-[color:var(--today-text)]">{source.title}</p>
            )}
            <p className="mt-1 text-xs text-[color:var(--today-muted)]">
              {source.contentType ?? 'resource'}
              {typeof source.relevanceScore === 'number'
                ? ` · relevance ${source.relevanceScore.toFixed(2)}`
                : ''}
            </p>
            {source.summary && (
              <p className="mt-2 text-xs text-[color:var(--today-text-soft)] line-clamp-3">{source.summary}</p>
            )}
            <ArtifactDetailsLink artifactId={source.id} />
          </div>
        ))}
      </div>
    </article>
  );
}

export function ConceptsOutputCard({
  concepts,
  conceptCount,
}: {
  concepts: GeneratedConcept[];
  conceptCount: number;
}) {
  return (
    <article className={`${surfacePanelClass} p-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Concepts</h3>
        <span className="text-xs text-[color:var(--today-muted)]">{conceptCount}</span>
      </div>
      <p className="mt-2 text-sm text-[color:var(--today-muted)]">
        These concepts were extracted by this run and are ready for review.
      </p>
      <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
        {concepts.map((concept) => (
          <div key={concept.id} className={`${insetPanelClass} p-3`}>
            <p className="text-sm font-medium text-[color:var(--today-text)]">{concept.title}</p>
            <p className="mt-1 text-xs text-[color:var(--today-muted)]">
              {concept.type ?? 'concept'}
              {concept.documentTitle ? ` · ${concept.documentTitle}` : ''}
            </p>
            {concept.summary && (
              <p className="mt-2 text-xs text-[color:var(--today-text-soft)] line-clamp-3">{concept.summary}</p>
            )}
            <ArtifactDetailsLink artifactId={concept.id} />
          </div>
        ))}
      </div>
    </article>
  );
}

export function FlashcardsOutputDetails({
  flashcards,
  flashcardCount,
}: {
  flashcards: GeneratedFlashcard[];
  flashcardCount: number;
}) {
  return (
    <details className={surfacePanelClass}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[color:var(--today-text-soft)] hover:text-[color:var(--today-text)]">
        Flashcards ({flashcardCount})
      </summary>
      <div className="border-t border-[rgba(255,255,255,0.08)] px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
        {flashcards.map((flashcard) => (
          <div key={flashcard.id} className={`${insetPanelClass} p-3`}>
            <p className="text-xs text-[color:var(--today-muted)]">{flashcard.format ?? 'card'}</p>
            <p className="mt-1 text-sm text-[color:var(--today-text)]">{flashcard.front ?? flashcard.title}</p>
            {flashcard.back && (
              <p className="mt-2 text-xs text-[color:var(--today-text-soft)] line-clamp-3">{flashcard.back}</p>
            )}
            <ArtifactDetailsLink artifactId={flashcard.id} />
          </div>
        ))}
      </div>
    </details>
  );
}

function ArtifactDetailsLink({ artifactId }: { artifactId: string }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Link
        href={`/artifacts/${artifactId}`}
        className="inline-flex text-xs text-[color:var(--today-muted-strong)] transition-colors hover:text-[color:var(--today-text)]"
      >
        View technical details
      </Link>
    </div>
  );
}
