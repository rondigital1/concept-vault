import { describe, expect, it } from 'vitest';
import {
  PRIMARY_TOP_NAV_KEYS,
  getTopNavItemsWithState,
  isImmersiveAppRoute,
  isTopNavItemActive,
} from '@/app/components/topNav';

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

describe('getTopNavItemsWithState', () => {
  it('marks the current primary section active', () => {
    const items = getTopNavItemsWithState('/reports/123', PRIMARY_TOP_NAV_KEYS);
    expect(items.find((item) => item.key === 'reports')?.active).toBe(true);
    expect(items.filter((item) => item.active)).toHaveLength(1);
  });
});

describe('isImmersiveAppRoute', () => {
  it('treats major route detail pages as immersive', () => {
    expect(isImmersiveAppRoute('/reports')).toBe(true);
    expect(isImmersiveAppRoute('/reports/123')).toBe(true);
    expect(isImmersiveAppRoute('/library/collections/abc')).toBe(true);
  });

  it('leaves non-workbench routes on the default shell', () => {
    expect(isImmersiveAppRoute('/chat')).toBe(false);
    expect(isImmersiveAppRoute('/web-scout')).toBe(false);
  });
});
