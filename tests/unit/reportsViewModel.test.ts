import { describe, expect, it } from 'vitest';
import { extractReportCitations, readReportDetail } from '@/app/reports/reportsViewModel';
import type { ArtifactRow } from '@/server/repos/artifacts.repo';

function makeReportArtifact(overrides: Partial<ArtifactRow> = {}): ArtifactRow {
  return {
    id: 'report-1',
    run_id: 'run-1',
    agent: 'distiller',
    kind: 'research-report',
    day: '2026-04-17',
    title: 'Market shift outlook',
    content: {
      title: 'Market shift outlook',
      executiveSummary: '- First key point\n- Second key point',
      topicsCovered: ['markets', 'policy'],
      sourcesCount: 2,
      markdown: [
        '## Summary',
        '',
        'Body content',
        '',
        '## Sources',
        '- [Federal Reserve update](https://www.federalreserve.gov/monetarypolicy.htm)',
        '1. [IMF note](https://www.imf.org/en/Publications)',
      ].join('\n'),
    },
    source_refs: {
      topicId: 'topic-1234567890',
    },
    status: 'approved',
    created_at: '2026-04-17T12:00:00.000Z',
    reviewed_at: '2026-04-17T12:05:00.000Z',
    read_at: null,
    ...overrides,
  };
}

describe('extractReportCitations', () => {
  it('reads linked citations from the markdown sources section', () => {
    const markdown = [
      '## Sources',
      '',
      '- [Federal Reserve update](https://www.federalreserve.gov/monetarypolicy.htm)',
      '2. [IMF note](https://www.imf.org/en/Publications)',
      'plain text that should be ignored',
    ].join('\n');

    expect(extractReportCitations(markdown)).toEqual([
      {
        title: 'Federal Reserve update',
        url: 'https://www.federalreserve.gov/monetarypolicy.htm',
        source: 'FEDERALRESERVE.GOV',
      },
      {
        title: 'IMF note',
        url: 'https://www.imf.org/en/Publications',
        source: 'IMF.ORG',
      },
    ]);
  });
});

describe('readReportDetail', () => {
  it('keeps dossier metadata, markdown, and parsed citations together for detail pages', () => {
    const detail = readReportDetail(makeReportArtifact());

    expect(detail.title).toBe('Market shift outlook');
    expect(detail.summaryLines).toEqual(['First key point', 'Second key point']);
    expect(detail.summaryPreview).toBe('First key point Second key point');
    expect(detail.markdown).toContain('## Sources');
    expect(detail.topicsCovered).toEqual(['markets', 'policy']);
    expect(detail.sourcesCount).toBe(2);
    expect(detail.isUnread).toBe(true);
    expect(detail.citations).toHaveLength(2);
  });
});
