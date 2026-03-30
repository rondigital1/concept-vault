import { describe, expect, it } from 'vitest';
import { isTopNavItemActive } from '@/app/components/topNav';

describe('isTopNavItemActive', () => {
  it('activates exact route matches', () => {
    expect(isTopNavItemActive('/today', '/today')).toBe(true);
  });

  it('activates nested routes under a section', () => {
    expect(isTopNavItemActive('/library/123', '/library')).toBe(true);
    expect(isTopNavItemActive('/library/collections/abc', '/library')).toBe(true);
    expect(isTopNavItemActive('/reports/456', '/reports')).toBe(true);
  });

  it('does not false-match sibling-like paths', () => {
    expect(isTopNavItemActive('/library-old', '/library')).toBe(false);
    expect(isTopNavItemActive('/reports-archive', '/reports')).toBe(false);
  });

  it('stays inactive for unrelated routes', () => {
    expect(isTopNavItemActive('/agent-control-center', '/today')).toBe(false);
    expect(isTopNavItemActive('/ingest', '/chat')).toBe(false);
  });
});
