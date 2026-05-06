import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  GeneratedFlashcard,
  GeneratedReport,
  GeneratedSource,
} from '@/app/web-scout/types';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

import {
  FlashcardsOutputDetails,
  ReportOutputCard,
  SourceCandidatesCard,
} from '@/app/web-scout/components/RunOutputCards';

describe('WebScout output cards', () => {
  it('renders report metadata and the report link', () => {
    const report: GeneratedReport = {
      id: 'report-1',
      title: 'AI Infrastructure Brief',
      day: '2026-05-06',
      sourcesCount: 2,
      topicsCovered: ['infra', 'costs'],
      preview: 'A short synthesis of the newest source material.',
      link: '/reports/report-1',
      notionPageId: null,
    };

    const html = renderToStaticMarkup(
      React.createElement(ReportOutputCard, { report }),
    );

    expect(html).toContain('AI Infrastructure Brief');
    expect(html).toContain('Day 2026-05-06');
    expect(html).toContain('2 sources');
    expect(html).toContain('Covers: infra, costs');
    expect(html).toContain('href="/reports/report-1"');
  });

  it('renders source candidate links without hiding artifact details', () => {
    const sources: GeneratedSource[] = [
      {
        id: 'source-1',
        title: 'External source',
        url: 'https://example.com/source',
        summary: 'Useful evidence from outside the vault.',
        relevanceScore: 0.91,
        contentType: 'research brief',
        topics: ['infra'],
      },
      {
        id: 'source-2',
        title: 'Untitled imported source',
        url: null,
        summary: null,
        relevanceScore: null,
        contentType: null,
        topics: [],
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(SourceCandidatesCard, {
        sources,
        sourceCount: sources.length,
      }),
    );

    expect(html).toContain('Source candidates');
    expect(html).toContain('href="https://example.com/source"');
    expect(html).toContain('relevance 0.91');
    expect(html).toContain('Untitled imported source');
    expect(html).toContain('href="/artifacts/source-1"');
    expect(html).toContain('href="/artifacts/source-2"');
  });

  it('renders flashcard details with artifact links', () => {
    const flashcards: GeneratedFlashcard[] = [
      {
        id: 'flashcard-1',
        title: 'Fallback title',
        format: 'qa',
        front: 'What changed?',
        back: 'The source pipeline was refactored.',
        documentTitle: null,
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(FlashcardsOutputDetails, {
        flashcards,
        flashcardCount: flashcards.length,
      }),
    );

    expect(html).toContain('Flashcards (1)');
    expect(html).toContain('What changed?');
    expect(html).toContain('The source pipeline was refactored.');
    expect(html).toContain('href="/artifacts/flashcard-1"');
  });
});
