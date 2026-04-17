export type TopNavKey =
  | 'today'
  | 'agents'
  | 'library'
  | 'reports'
  | 'ingest'
  | 'chat';

export type TopNavPlacement = 'primary' | 'utility';
export type AppShellMode = 'default' | 'immersive' | 'utility-detail';

export type TopNavItem = {
  key: TopNavKey;
  href: string;
  label: string;
  placement: TopNavPlacement;
};

export const APP_BRAND = {
  monogram: 'CV',
  name: 'Concept Vault',
  shellLabel: 'Research Workbench',
  shellDescription:
    'Shared shell for utility routes, run details, and recovery states while immersive workspaces own their local chrome.',
} as const;

export const TOP_NAV_ITEMS: TopNavItem[] = [
  { key: 'today', href: '/today', label: 'Research', placement: 'primary' },
  { key: 'agents', href: '/agents', label: 'Agents', placement: 'primary' },
  { key: 'library', href: '/library', label: 'Library', placement: 'primary' },
  { key: 'reports', href: '/reports', label: 'Reports', placement: 'primary' },
  { key: 'ingest', href: '/ingest', label: 'Add Content', placement: 'utility' },
  { key: 'chat', href: '/chat', label: 'Ask Vault', placement: 'utility' },
];

export const TOP_NAV_GROUP_LABELS = {
  primary: 'Primary destinations',
  utility: 'Utilities',
} as const;

export const PRIMARY_TOP_NAV_KEYS: TopNavKey[] = TOP_NAV_ITEMS.filter(
  (item) => item.placement === 'primary',
).map((item) => item.key);
export const UTILITY_TOP_NAV_KEYS: TopNavKey[] = TOP_NAV_ITEMS.filter(
  (item) => item.placement === 'utility',
).map((item) => item.key);
export const DEFAULT_TOP_NAV_KEYS: TopNavKey[] = TOP_NAV_ITEMS.map((item) => item.key);

const TOP_NAV_ITEMS_BY_KEY = new Map(TOP_NAV_ITEMS.map((item) => [item.key, item]));
const APP_SHELL_ROUTE_PREFIXES: Array<{ mode: AppShellMode; prefixes: string[] }> = [
  { mode: 'immersive', prefixes: ['/agents', '/chat', '/ingest', '/library', '/reports', '/today'] },
  { mode: 'utility-detail', prefixes: ['/artifacts', '/web-scout'] },
];

function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isTopNavItemActive(pathname: string, href: string): boolean {
  return matchesRoutePrefix(pathname, href);
}

export function getTopNavItems(keys: TopNavKey[] = DEFAULT_TOP_NAV_KEYS): TopNavItem[] {
  return keys.flatMap((key) => {
    const item = TOP_NAV_ITEMS_BY_KEY.get(key);
    return item ? [item] : [];
  });
}

export function getTopNavItemsWithState(pathname: string, keys: TopNavKey[] = DEFAULT_TOP_NAV_KEYS) {
  return getTopNavItems(keys).map((item) => ({
    ...item,
    active: isTopNavItemActive(pathname, item.href),
  }));
}

export function getTopNavGroupsWithState(pathname: string) {
  return {
    primary: getTopNavItemsWithState(pathname, PRIMARY_TOP_NAV_KEYS),
    utility: getTopNavItemsWithState(pathname, UTILITY_TOP_NAV_KEYS),
  };
}

export function getAppShellMode(pathname: string): AppShellMode {
  for (const entry of APP_SHELL_ROUTE_PREFIXES) {
    if (entry.prefixes.some((prefix) => matchesRoutePrefix(pathname, prefix))) {
      return entry.mode;
    }
  }

  return 'default';
}

export function isImmersiveAppRoute(pathname: string): boolean {
  return getAppShellMode(pathname) === 'immersive';
}
