/**
 * Research Flow
 *
 * Orchestrates: derive goal from vault → WebScout → synthesize report → save.
 * All steps recorded under a single 'research' run.
 */

import { createRun, appendStep, finishRun } from '@/server/observability/runTrace.store';
import { RunStep } from '@/server/observability/runTrace.types';
import { getTopTags } from '@/server/services/today.service';
import { webScoutGraph } from '@/server/agents/webScout.graph';
import { synthesizeReport } from '@/server/services/report.service';
import { insertReport } from '@/server/repos/report.repo';

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface ResearchFlowResult {
  runId: string;
  reportId: string | null;
  proposalCount: number;
}

async function executeResearchFlow(runId: string): Promise<ResearchFlowResult> {
  const day = todayISODate();

  try {
    // Step 1: Derive goal from vault tags
    const deriveStep: RunStep = {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'research_derive_goal',
      status: 'running',
    };
    await appendStep(runId, deriveStep);

    const topTags = await getTopTags(5);
    if (topTags.length === 0) {
      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'research_derive_goal',
        status: 'error',
        error: { message: 'No tags in vault — import documents first' },
      });
      await finishRun(runId, 'error');
      throw new Error('No tags in vault — import documents first');
    }

    const tagNames = topTags.map((t) => t.tag);
    const goal = `Find high-quality learning resources about: ${tagNames.join(', ')}`;

    await appendStep(runId, {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'research_derive_goal',
      status: 'ok',
      output: { goal, tags: tagNames },
    });

    // Step 2: Run WebScout
    await appendStep(runId, {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'research_webscout',
      status: 'running',
    });

    const scoutResult = await webScoutGraph(
      {
        goal,
        mode: 'derive-from-vault',
        day,
        focusTags: tagNames,
        minQualityResults: 3,
        maxIterations: 5,
        maxQueries: 10,
      },
      async (step) => {
        await appendStep(runId, step);
      },
      runId,
    );

    await appendStep(runId, {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'research_webscout',
      status: 'ok',
      output: scoutResult.counts,
    });

    // Step 3: Synthesize report (skip if no proposals)
    if (scoutResult.proposals.length === 0) {
      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'research_synthesize',
        status: 'skipped',
        output: { reason: 'No proposals from WebScout' },
      });
      await finishRun(runId, 'partial');
      return { runId, reportId: null, proposalCount: 0 };
    }

    await appendStep(runId, {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'research_synthesize',
      status: 'running',
    });

    const report = await synthesizeReport(goal, scoutResult.proposals, tagNames);

    await appendStep(runId, {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'research_synthesize',
      status: 'ok',
      output: { title: report.title, sourcesCount: report.sourcesCount },
    });

    // Step 4: Save report
    const reportId = await insertReport({
      runId,
      day,
      title: report.title,
      content: {
        markdown: report.markdown,
        title: report.title,
        executiveSummary: report.executiveSummary,
        sourcesCount: report.sourcesCount,
        topicsCovered: report.topicsCovered,
      },
      sourceRefs: {
        proposals: scoutResult.proposals.map((p) => ({
          url: p.url,
          title: p.title,
        })),
      },
    });

    await appendStep(runId, {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'research_save_report',
      status: 'ok',
      output: { reportId },
    });

    await finishRun(runId, 'ok');
    return { runId, reportId, proposalCount: scoutResult.proposals.length };
  } catch (error) {
    await appendStep(runId, {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'research_error',
      status: 'error',
      error: { message: error instanceof Error ? error.message : String(error) },
    });

    // Only call finishRun if we haven't already
    try {
      await finishRun(runId, 'error');
    } catch {
      // Run already finished
    }
    throw error;
  }
}

/**
 * Start a research flow in the background.
 * Returns the runId immediately.
 */
export async function startResearchFlow(): Promise<{ runId: string }> {
  const runId = await createRun('research');

  setImmediate(() => {
    void executeResearchFlow(runId).catch((error) => {
      console.error('[ResearchFlow] Background run failed:', error);
    });
  });

  return { runId };
}

/**
 * Run research flow synchronously and return results.
 */
export async function researchFlow(): Promise<ResearchFlowResult> {
  const runId = await createRun('research');
  return executeResearchFlow(runId);
}
