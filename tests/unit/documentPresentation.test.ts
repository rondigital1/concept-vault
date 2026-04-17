import { describe, expect, it } from 'vitest';
import {
  buildDocumentPreview,
  inferDocumentFormatBucket,
  matchesLibrarySearch,
} from '@/app/library/documentPresentation';

describe('inferDocumentFormatBucket', () => {
  it('classifies pdf, web, and text documents from live library fields', () => {
    expect(
      inferDocumentFormatBucket({
        title: 'Quarterly filing',
        source: 'https://example.com/report.pdf',
      }),
    ).toBe('pdf');

    expect(
      inferDocumentFormatBucket({
        title: 'Market map',
        source: 'https://example.com/market-map',
      }),
    ).toBe('web');

    expect(
      inferDocumentFormatBucket({
        title: 'Scratchpad note',
        source: 'Imported manually',
      }),
    ).toBe('text');
  });
});

describe('buildDocumentPreview', () => {
  it('strips markdown noise into a readable card preview', () => {
    expect(
      buildDocumentPreview('# Heading\n\nA paragraph with a [link](https://example.com) and `inline code`.'),
    ).toBe('Heading A paragraph with a link and .');
  });
});

describe('matchesLibrarySearch', () => {
  it('matches multi-term queries across title, tags, and source', () => {
    expect(
      matchesLibrarySearch(
        {
          title: 'Atlas Graph onboarding memo',
          source: 'https://docs.example.com/internal-onboarding',
          tags: ['travel ops', 'launch'],
        },
        'onboarding launch',
      ),
    ).toBe(true);

    expect(
      matchesLibrarySearch(
        {
          title: 'Atlas Graph onboarding memo',
          source: 'https://docs.example.com/internal-onboarding',
          tags: ['travel ops', 'launch'],
        },
        'billing launch',
      ),
    ).toBe(false);
  });
});
