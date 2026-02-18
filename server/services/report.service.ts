/**
 * Report Synthesis Service
 *
 * Uses LLM to synthesize WebScout proposals into a readable markdown report.
 */

import { createGenerationModel } from '@/server/langchain/models';
import { HumanMessage } from '@langchain/core/messages';
import { WebScoutProposal } from '@/server/agents/helpers/webScout.types';

export interface ReportContent {
  markdown: string;
  title: string;
  executiveSummary: string;
  sourcesCount: number;
  topicsCovered: string[];
}

/**
 * Synthesize WebScout proposals into a structured markdown report.
 * Falls back to a simple bullet-point list on LLM failure.
 */
export async function synthesizeReport(
  goal: string,
  proposals: WebScoutProposal[],
  vaultTopics: string[],
): Promise<ReportContent> {
  const proposalText = proposals
    .map(
      (p, i) =>
        `[${i + 1}] "${p.title}" (${p.url})\n` +
        `    Score: ${p.relevanceScore} | Type: ${p.contentType}\n` +
        `    Summary: ${p.summary}\n` +
        `    Topics: ${p.topics.join(', ')}\n` +
        `    Reasoning: ${p.reasoning.join('; ')}`,
    )
    .join('\n\n');

  const prompt = `You are writing a research report based on web resources found for a learning goal.

GOAL: ${goal}
VAULT TOPICS: ${vaultTopics.join(', ')}

RESOURCES FOUND:
${proposalText}

Write a markdown report with these sections:
1. **Title** (H1) - a descriptive title for this research session
2. **Executive Summary** - 2-3 sentence overview of what was found
3. **Key Findings** - for each resource, a subsection (H3) with: what it covers, why it's relevant, key takeaways
4. **Synthesis** - connections between resources, how they relate to the learning goal
5. **Recommended Next Steps** - 3-5 actionable items for the learner
6. **Sources** - numbered list with titles and URLs

Keep it concise and actionable. Use markdown formatting.`;

  try {
    const model = createGenerationModel({ temperature: 0.7, maxTokens: 4096 });
    const response = await model.invoke([new HumanMessage(prompt)]);

    const markdown =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const title = extractTitle(markdown) || `Research: ${goal}`;
    const executiveSummary = extractSummary(markdown);
    const allTopics = [...new Set(proposals.flatMap((p) => p.topics))];

    return {
      markdown,
      title,
      executiveSummary,
      sourcesCount: proposals.length,
      topicsCovered: allTopics,
    };
  } catch (error) {
    console.error('[ReportService] LLM synthesis failed, using fallback:', error);
    return buildFallbackReport(goal, proposals, vaultTopics);
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
  proposals: WebScoutProposal[],
  vaultTopics: string[],
): ReportContent {
  const lines = [
    `# Research: ${goal}`,
    '',
    `## Summary`,
    '',
    `Found ${proposals.length} resource(s) related to: ${goal}.`,
    `Vault topics: ${vaultTopics.join(', ') || 'none'}.`,
    '',
    '## Resources',
    '',
    ...proposals.map(
      (p, i) =>
        `${i + 1}. **[${p.title}](${p.url})** (score: ${p.relevanceScore})\n   ${p.summary}`,
    ),
    '',
  ];

  const markdown = lines.join('\n');
  const allTopics = [...new Set(proposals.flatMap((p) => p.topics))];

  return {
    markdown,
    title: `Research: ${goal}`,
    executiveSummary: `Found ${proposals.length} resource(s) related to: ${goal}.`,
    sourcesCount: proposals.length,
    topicsCovered: allTopics,
  };
}
