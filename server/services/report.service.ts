/**
 * Report Synthesis Service
 *
 * Uses LLM to synthesize WebScout proposals into a readable markdown report.
 */

import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { AI_BUDGETS } from '@/server/ai/budget-policy';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';
import { AnalyzeFindingsOutput } from '@/server/services/analyzeFindings.service';

export interface ReportContent {
  markdown: string;
  title: string;
  executiveSummary: string;
  sourcesCount: number;
  topicsCovered: string[];
}

/**
 * Synthesize analyzed findings into a structured markdown report.
 * Falls back to a simple bullet-point list on LLM failure.
 */
export async function synthesizeReport(
  goal: string,
  findings: AnalyzeFindingsOutput,
  vaultTopics: string[],
  jobId?: string,
): Promise<ReportContent> {
  const proposalText = findings.evidence
    .map(
      (p, i) =>
        `[${i + 1}] "${p.title}" (${p.url})\n` +
        `    Score: ${p.relevanceScore} | Type: ${p.contentType}\n` +
        `    Summary: ${p.summary}\n` +
        `    Topics: ${p.topics.join(', ') || 'none'}\n` +
        `    Cluster: ${p.clusterId}\n` +
        `    Reasoning: ${p.reasoning.join('; ')}`,
    )
    .join('\n\n');

  try {
    const prompt = buildPrompt({
      task: AI_TASKS.generateFinalReport,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'You write credible, high-signal markdown research reports from vetted findings.',
        },
        {
          heading: 'Report Structure',
          content: [
            'Use an H1 title.',
            'Use exactly these H2 sections: Executive Summary, Key Takeaways, Findings by Theme, Source-by-Source Notes, Synthesis, Recommended Next Steps, and Sources.',
            'Executive Summary must contain 4-6 bullets.',
            'Key Takeaways must contain 6-10 bullets.',
            'Findings by Theme must use multiple H3 subsections and explain what matters, why it matters, and any caveats.',
            'Source-by-Source Notes must include one H3 subsection per source with at least 3 bullets: what it covers, useful evidence, and why it is relevant.',
            'Synthesis must contain 4-6 bullets connecting the evidence.',
            'Recommended Next Steps must contain 5-8 concrete actions.',
            'Prefer dense, concrete bullets over generic prose.',
            'Call out uncertainty, disagreement, or thin evidence when present.',
            'Only use the provided findings.',
          ].join('\n'),
        },
      ],
      requestPayload: [
        {
          heading: 'Goal',
          content: goal,
        },
        {
          heading: 'Vault Topics',
          content: vaultTopics.join(', ') || 'none',
        },
        {
          heading: 'Analysis Summary',
          content: [
            `Input resources: ${findings.summary.totalInput}`,
            `Unique evidence after normalization and dedupe: ${findings.summary.uniqueEvidence}`,
            `Clusters: ${findings.summary.clusters}`,
            `Top domains: ${findings.summary.topDomains.join(', ') || 'none'}`,
          ].join('\n'),
        },
        {
          heading: 'Resources Found',
          content: proposalText,
        },
      ],
    });
    const response = await openAIExecutionService.executeText({
      task: AI_TASKS.generateFinalReport,
      prompt,
      temperature: 0.4,
      budget: AI_BUDGETS.reportSynthesis,
      attribution: {
        runId: jobId,
      },
    });
    const markdown = response.output;

    const title = extractTitle(markdown) || `Research: ${goal}`;
    const executiveSummary = extractSummary(markdown);
    const allTopics = [...new Set(findings.evidence.flatMap((p) => p.topics))];

    return {
      markdown,
      title,
      executiveSummary,
      sourcesCount: findings.evidence.length,
      topicsCovered: allTopics,
    };
  } catch (error) {
    console.error('[ReportService] LLM synthesis failed, using fallback:', error);
    return buildFallbackReport(goal, findings, vaultTopics);
  }
}

function extractTitle(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractSummary(markdown: string): string {
  // Look for content after "Executive Summary" or "Summary" heading
  const match = markdown.match(
    /##\s+(?:Executive\s+)?Summary\s*\n+([\s\S]*?)(?=\n##|\n#\s|$)/i,
  );
  if (match) {
    return match[1].trim().slice(0, 500);
  }
  // Fallback: first paragraph after title
  const lines = markdown.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  return lines[0]?.trim().slice(0, 500) || '';
}

function buildFallbackReport(
  goal: string,
  findings: AnalyzeFindingsOutput,
  vaultTopics: string[],
): ReportContent {
  const topEvidence = findings.evidence.slice(0, 8);
  const topClusters = findings.clusters.slice(0, 4);
  const allTopics = [...new Set(findings.evidence.flatMap((p) => p.topics))];

  const lines = [
    `# Research: ${goal}`,
    '',
    `## Executive Summary`,
    '',
    `- Found ${findings.evidence.length} deduplicated resource(s) related to: ${goal}.`,
    `- Evidence clusters identified: ${findings.summary.clusters}.`,
    `- Average relevance score: ${findings.summary.averageRelevance.toFixed(2)}.`,
    `- Top domains: ${findings.summary.topDomains.join(', ') || 'none'}.`,
    `- Vault topics in scope: ${vaultTopics.join(', ') || 'none'}.`,
    '',
    '## Key Takeaways',
    '',
    ...topEvidence.map(
      (p) =>
        `- **${p.title}**: ${p.summary} Why it matters: ${p.reasoning[0] ?? 'It directly supports the research goal.'}`,
    ),
    '',
  ];

  lines.push('## Findings by Theme', '');

  for (const cluster of topClusters) {
    const clusterEvidence = topEvidence.filter((item) => item.clusterId === cluster.id).slice(0, 3);
    lines.push(`### ${cluster.label}`);
    lines.push(`- Theme size: ${cluster.count} source(s) with average relevance ${cluster.averageRelevance.toFixed(2)}.`);
    lines.push(`- Topics: ${cluster.topics.join(', ') || 'none'}.`);
    lines.push(`- Domains represented: ${cluster.domains.join(', ') || 'none'}.`);
    for (const item of clusterEvidence) {
      lines.push(`- **${item.title}**: ${item.summary}`);
    }
    lines.push('');
  }

  lines.push('## Source-by-Source Notes', '');

  for (const [index, item] of topEvidence.entries()) {
    lines.push(`### ${index + 1}. [${item.title}](${item.url})`);
    lines.push(`- Covers: ${item.summary}`);
    lines.push(`- Useful evidence: topics ${item.topics.join(', ') || 'none'}; content type ${item.contentType}; relevance ${item.relevanceScore.toFixed(2)}.`);
    lines.push(`- Why it is relevant: ${item.reasoning.join('; ') || 'Directly related to the goal.'}`);
    lines.push('');
  }

  lines.push('## Synthesis', '');
  lines.push(`- The strongest themes cluster around ${topClusters.map((cluster) => cluster.label).join(', ') || 'a small set of related areas'}.`);
  lines.push(`- The most represented domains are ${findings.summary.topDomains.join(', ') || 'not yet clear from the current evidence'}.`);
  lines.push(`- Recurring topics include ${allTopics.slice(0, 6).join(', ') || 'none identified yet'}.`);
  lines.push('- The current evidence provides a solid starting point, but high-stakes decisions should still be checked against primary sources.');
  lines.push('');
  lines.push('## Recommended Next Steps', '');
  lines.push(`- Read the highest-relevance sources first and capture notes tied directly to "${goal}".`);
  lines.push('- Compare overlapping sources to isolate agreement, disagreement, and gaps.');
  lines.push('- Approve the strongest recurring concepts so they become part of the active vault.');
  lines.push('- Add more first-party or primary material if the current evidence leans heavily on commentary.');
  lines.push('- Re-run the report after new linked documents are added to this topic.');
  lines.push('');
  lines.push('## Sources', '');
  lines.push(...topEvidence.map((p, i) => `${i + 1}. [${p.title}](${p.url})`));
  lines.push('');

  const markdown = lines.join('\n');

  return {
    markdown,
    title: `Research: ${goal}`,
    executiveSummary: `Found ${findings.evidence.length} resource(s) related to: ${goal}.`,
    sourcesCount: findings.evidence.length,
    topicsCovered: allTopics,
  };
}
