import { sectionLabelClass } from '@/app/today/WorkspaceHeaderPrimitives';
import {
  insetPanelClass,
  issuePanelClass,
  surfacePanelClass,
} from '../styles';
import type { RunOutputCounts } from '../runOutputCounts';
import type { RunResultsPayload } from '../types';
import { OutcomeCountCard } from './RunPrimitives';
import {
  ConceptsOutputCard,
  FlashcardsOutputDetails,
  ReportOutputCard,
  SourceCandidatesCard,
} from './RunOutputCards';

export function RunOutputsPanel({
  isAwaitingTopicSelection,
  isRunning,
  resultsError,
  results,
  outputCounts,
}: {
  isAwaitingTopicSelection: boolean;
  isRunning: boolean;
  resultsError: string | null;
  results: RunResultsPayload | null;
  outputCounts: RunOutputCounts;
}) {
  const resultsReady = !isAwaitingTopicSelection && !isRunning && !resultsError && Boolean(results);
  const noOutputsCreated = resultsReady && outputCounts.generatedCount === 0;

  return (
    <div className={surfacePanelClass}>
      <div className="border-b border-[rgba(255,255,255,0.08)] px-5 py-4">
        <h2 className={sectionLabelClass}>What this run created</h2>
        <p className="mt-1 text-xs text-[color:var(--today-muted)]">
          Results first: report, review items, and direct next places to go.
        </p>
      </div>

      <div className="p-5 space-y-5">
        {isAwaitingTopicSelection && (
          <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
            Select a topic above to start a full report run. The finished report summary and next actions will appear here.
          </div>
        )}

        {isRunning && (
          <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
            The run is still working. This area will update with finished outputs and next actions when processing completes.
          </div>
        )}

        {!isAwaitingTopicSelection && !isRunning && resultsError && (
          <div className={`${issuePanelClass} text-sm text-[#ffdada]`}>
            {resultsError}
          </div>
        )}

        {!isAwaitingTopicSelection && !isRunning && !resultsError && !results && (
          <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-muted)]`}>
            Loading finished outputs...
          </div>
        )}

        {resultsReady && results && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OutcomeCountCard
              label="Report"
              value={results.report ? 'Ready' : '—'}
              hint={results.report ? 'Open the finished report.' : 'No report created in this run.'}
            />
            <OutcomeCountCard
              label="Source Candidates"
              value={outputCounts.sourceCount}
              hint={outputCounts.sourceCount > 0 ? 'Review these in the queue.' : 'No new sources proposed.'}
            />
            <OutcomeCountCard
              label="Concepts"
              value={outputCounts.conceptCount}
              hint={outputCounts.conceptCount > 0 ? 'New concepts are ready to review.' : 'No concepts extracted.'}
            />
            <OutcomeCountCard
              label="Flashcards"
              value={outputCounts.flashcardCount}
              hint={outputCounts.flashcardCount > 0 ? 'New flashcards are ready to review.' : 'No flashcards generated.'}
            />
          </div>
        )}

        {noOutputsCreated && (
          <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-muted)]`}>
            No new sources, concepts, flashcards, or report were created in this run.
          </div>
        )}

        {results?.report && (
          <ReportOutputCard report={results.report} />
        )}

        {resultsReady && results && outputCounts.sourceCount > 0 && (
          <SourceCandidatesCard
            sources={results.sources}
            sourceCount={outputCounts.sourceCount}
          />
        )}

        {resultsReady && results && outputCounts.conceptCount > 0 && (
          <ConceptsOutputCard
            concepts={results.concepts}
            conceptCount={outputCounts.conceptCount}
          />
        )}

        {resultsReady && results && outputCounts.flashcardCount > 0 && (
          <FlashcardsOutputDetails
            flashcards={results.flashcards}
            flashcardCount={outputCounts.flashcardCount}
          />
        )}
      </div>
    </div>
  );
}
