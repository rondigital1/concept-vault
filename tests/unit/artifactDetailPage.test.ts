import { describe, expect, it } from 'vitest';
import { readArtifactOverview } from '@/app/reports/artifactOverview';
import type { ArtifactRow } from '@/server/repos/artifacts.repo';

function makeArtifact(overrides: Partial<ArtifactRow> = {}): ArtifactRow {
  return {
    id: 'artifact-1',
    run_id: 'run-1',
    agent: 'webScout',
    kind: 'web-proposal',
    day: '2026-04-17',
    title: 'Artifact title',
    content: {},
    source_refs: {},
    status: 'proposed',
    created_at: '2026-04-17T12:00:00.000Z',
    reviewed_at: null,
    read_at: null,
    ...overrides,
  };
}

describe('readArtifactOverview', () => {
  it('builds report artifact overviews with citations and the report route CTA', () => {
    const overview = readArtifactOverview(
      makeArtifact({
        kind: 'research-report',
        content: {
          executiveSummary: 'Approved synthesis',
          sourcesCount: 3,
          topicsCovered: ['policy', 'risk'],
          markdown: [
            '## Sources',
            '- [Policy note](https://example.com/policy)',
          ].join('\n'),
        },
      }),
    );

    expect(overview.summaryTitle).toBe('Report overview');
    expect(overview.stats).toEqual([
      { label: 'Sources used', value: '3' },
      { label: 'Topics covered', value: '2' },
    ]);
    expect(overview.citations).toEqual([
      {
        title: 'Policy note',
        url: 'https://example.com/policy',
        source: 'EXAMPLE.COM',
      },
    ]);
    expect(overview.primaryLink).toEqual({ href: '/reports/artifact-1', label: 'Open report' });
  });

  it('prefers the saved library document for approved source candidates', () => {
    const overview = readArtifactOverview(
      makeArtifact({
        status: 'approved',
        content: {
          summary: 'Useful source',
          relevanceScore: 0.91,
          contentType: 'research brief',
          topics: ['macro'],
          reasoning: ['High signal'],
          url: 'https://example.com/source',
        },
        source_refs: {
          documentId: 'doc-99',
        },
      }),
    );

    expect(overview.summaryTitle).toBe('Source candidate overview');
    expect(overview.primaryLink).toEqual({ href: '/library/doc-99', label: 'Open in Library' });
    expect(overview.reasoning).toEqual(['High signal']);
    expect(overview.statusNotice).toBe('This source has already been added to Library.');
  });

  it('keeps non-report artifacts readable without inventing report-specific controls', () => {
    const overview = readArtifactOverview(
      makeArtifact({
        kind: 'concept',
        content: {
          summary: 'Concept summary',
          type: 'framework',
          documentTitle: 'Source memo',
          evidence: ['Supporting quote'],
        },
      }),
    );

    expect(overview.summaryTitle).toBe('Concept overview');
    expect(overview.stats).toEqual([
      { label: 'Type', value: 'framework' },
      { label: 'From document', value: 'Source memo' },
    ]);
    expect(overview.evidence).toEqual(['Supporting quote']);
    expect(overview.primaryLink).toBeNull();
  });
});
