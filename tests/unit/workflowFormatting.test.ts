import { describe, expect, it } from 'vitest';
import { formatElapsedTime } from '@/app/components/workflowFormatting';
import { readDurationMs } from '@/lib/agentRunPresentation';

describe('workflow formatting', () => {
  it('renders in-progress durations without Date.now-dependent hydration text', () => {
    expect(formatElapsedTime('2026-05-20T03:00:00.000Z')).toBe('In progress');
    expect(readDurationMs('2026-05-20T03:00:00.000Z')).toBeNull();
  });

  it('formats completed durations from fixed timestamps', () => {
    expect(
      formatElapsedTime('2026-05-20T03:00:00.000Z', '2026-05-20T03:00:25.600Z'),
    ).toBe('25.6s');
    expect(
      readDurationMs('2026-05-20T03:00:00.000Z', '2026-05-20T03:00:25.600Z'),
    ).toBe(25600);
  });
});
