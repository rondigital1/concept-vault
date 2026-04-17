import { describe, expect, it } from 'vitest';
import {
  buildNextHref,
  getTopicForSelection,
  readDrawerKey,
  readQueueFilter,
} from '@/app/today/routeState';

describe('today route state helpers', () => {
  it('keeps the requested topic when it exists', () => {
    expect(
      getTopicForSelection(
        [
          { id: 'topic-a' },
          { id: 'topic-b' },
        ] as Array<{ id: string }>,
        'topic-b',
      ),
    ).toBe('topic-b');
  });

  it('falls back to the first topic when the preferred one is missing', () => {
    expect(
      getTopicForSelection(
        [
          { id: 'topic-a' },
          { id: 'topic-b' },
        ] as Array<{ id: string }>,
        'missing',
      ),
    ).toBe('topic-a');
  });

  it('accepts the supported queue filters', () => {
    expect(readQueueFilter('saved', 'pending')).toBe('saved');
    expect(readQueueFilter('pending', 'saved')).toBe('pending');
    expect(readQueueFilter('unknown', 'saved')).toBe('saved');
  });

  it('accepts the evidence drawer key for mobile review flows', () => {
    expect(readDrawerKey('evidence', null)).toBe('evidence');
    expect(readDrawerKey('topic', null)).toBe('topic');
    expect(readDrawerKey('unknown', 'report')).toBe('report');
  });

  it('updates and removes url state without dropping unrelated params', () => {
    const href = buildNextHref(
      '/today',
      new URLSearchParams('topicId=topic-a&queue=pending&view=compact'),
      {
        artifactId: 'artifact-1',
        drawer: 'evidence',
        queue: null,
      },
    );

    expect(href).toBe('/today?topicId=topic-a&view=compact&artifactId=artifact-1&drawer=evidence');
  });
});
