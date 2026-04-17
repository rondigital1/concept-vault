import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addToast,
  getToastAnnouncementText,
  getToastSnapshot,
  getToastVisualTheme,
  resetToastState,
} from '@/app/components/Toast';
import { formatStatusLabel, resolveStatusTone } from '@/app/components/StatusBadge';
import {
  getRouteStatusToneConfig,
  routeStatusActionClassName,
} from '@/app/components/RouteStatusShell';

describe('toast shared primitives', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetToastState();
  });

  afterEach(() => {
    resetToastState();
    vi.useRealTimers();
  });

  it('auto-dismisses a toast after the configured duration', () => {
    const id = addToast('Saved to library', 'success', { durationMs: 1500 });

    expect(getToastSnapshot().map((toastRecord) => toastRecord.id)).toContain(id);

    vi.advanceTimersByTime(1500);

    expect(getToastSnapshot()).toHaveLength(0);
  });

  it('builds accessible toast announcements and muted skins', () => {
    expect(
      getToastAnnouncementText({
        type: 'error',
        message: 'Upload failed',
      }),
    ).toBe('Error: Upload failed');

    expect(getToastVisualTheme('success', 'muted').panel).toContain('bg-[rgba(28,28,28,0.96)]');
  });
});

describe('status badge helpers', () => {
  it('maps status codes onto the shared badge tones', () => {
    expect(resolveStatusTone('ok')).toBe('success');
    expect(resolveStatusTone('running')).toBe('warning');
    expect(resolveStatusTone('queued')).toBe('default');
  });

  it('formats underscored labels for screen-reader friendly output', () => {
    expect(formatStatusLabel('source_watch')).toBe('Source Watch');
  });
});

describe('route status shell helpers', () => {
  it('keeps danger shells on the shared warm error palette', () => {
    expect(getRouteStatusToneConfig('danger').badge).toContain('#f2c7bc');
  });

  it('keeps secondary shell actions on the outlined button treatment', () => {
    expect(routeStatusActionClassName('secondary')).toContain('border-white/[0.12]');
  });
});
