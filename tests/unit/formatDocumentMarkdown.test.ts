import { describe, expect, it } from 'vitest';
import { formatDocumentMarkdown } from '@/app/library/[id]/formatDocumentMarkdown';

describe('formatDocumentMarkdown', () => {
  it('rebuilds soft-wrapped prose into readable paragraphs', () => {
    const input = [
      'This is the first sentence of a paragraph that was extracted with hard wraps',
      'from the source page and should render as one readable block for the library view.',
      'This starts a new paragraph after the previous sentence ended cleanly and should stay separate from the first block.',
    ].join('\n');

    expect(formatDocumentMarkdown(input)).toBe(
      [
        'This is the first sentence of a paragraph that was extracted with hard wraps from the source page and should render as one readable block for the library view.',
        '',
        'This starts a new paragraph after the previous sentence ended cleanly and should stay separate from the first block.',
      ].join('\n')
    );
  });

  it('preserves structural markdown blocks', () => {
    const input = [
      '# Title',
      '',
      'Intro line one',
      'intro line two',
      '',
      '- first item',
      '- second item',
      '',
      '```ts',
      'const answer = 42;',
      '```',
    ].join('\n');

    expect(formatDocumentMarkdown(input)).toBe(
      [
        '# Title',
        '',
        'Intro line one intro line two',
        '',
        '- first item',
        '- second item',
        '',
        '```ts',
        'const answer = 42;',
        '```',
      ].join('\n')
    );
  });
});
