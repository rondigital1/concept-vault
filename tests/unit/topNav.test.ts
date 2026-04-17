import { describe, expect, it } from 'vitest';
import {
  PRIMARY_TOP_NAV_KEYS,
  UTILITY_TOP_NAV_KEYS,
  getAppShellMode,
  getTopNavGroupsWithState,
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

  it('marks shared utility destinations from the same source of truth', () => {
    const items = getTopNavItemsWithState('/chat', UTILITY_TOP_NAV_KEYS);
    expect(items.map((item) => item.label)).toEqual(['Add Content', 'Ask Vault']);
    expect(items.find((item) => item.key === 'chat')?.active).toBe(true);
  });
});

describe('getTopNavGroupsWithState', () => {
  it('splits primary and utility navigation for the shared shell', () => {
    const groups = getTopNavGroupsWithState('/chat');
    expect(groups.primary.map((item) => item.label)).toEqual([
      'Research',
      'Agents',
      'Library',
      'Reports',
    ]);
    expect(groups.utility.map((item) => item.label)).toEqual(['Add Content', 'Ask Vault']);
  });
});

describe('getAppShellMode', () => {
  it('classifies immersive route families', () => {
    expect(getAppShellMode('/reports')).toBe('immersive');
    expect(getAppShellMode('/reports/123')).toBe('immersive');
    expect(getAppShellMode('/library/collections/abc')).toBe('immersive');
  });

  it('keeps utility detail routes on the shared shell', () => {
    expect(getAppShellMode('/web-scout')).toBe('utility-detail');
    expect(getAppShellMode('/artifacts/item-1')).toBe('utility-detail');
  });

  it('leaves default-shell utilities and fallbacks on the shared shell', () => {
    expect(getAppShellMode('/chat')).toBe('immersive');
    expect(getAppShellMode('/unknown-route')).toBe('default');
  });
});

describe('isImmersiveAppRoute', () => {
  it('treats major route detail pages as immersive', () => {
    expect(isImmersiveAppRoute('/reports')).toBe(true);
    expect(isImmersiveAppRoute('/reports/123')).toBe(true);
    expect(isImmersiveAppRoute('/library/collections/abc')).toBe(true);
  });

  it('leaves non-workbench routes on the default shell', () => {
    expect(isImmersiveAppRoute('/chat')).toBe(true);
    expect(isImmersiveAppRoute('/web-scout')).toBe(false);
  });
});
