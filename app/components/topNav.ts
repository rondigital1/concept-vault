export type TopNavKey =
  | 'today'
  | 'agents'
  | 'library'
  | 'reports'
  | 'ingest'
  | 'chat';

export type TopNavItem = {
  key: TopNavKey;
  href: string;
  label: string;
};

export const TOP_NAV_ITEMS: TopNavItem[] = [
  { key: 'today', href: '/today', label: 'Research' },
  { key: 'agents', href: '/agents', label: 'Agents' },
  { key: 'library', href: '/library', label: 'Library' },
  { key: 'reports', href: '/reports', label: 'Reports' },
  { key: 'ingest', href: '/ingest', label: 'Add Content' },
  { key: 'chat', href: '/chat', label: 'Ask Vault' },
];

export const PRIMARY_TOP_NAV_KEYS: TopNavKey[] = ['today', 'agents', 'library', 'reports'];
export const DEFAULT_TOP_NAV_KEYS: TopNavKey[] = TOP_NAV_ITEMS.map((item) => item.key);

const TOP_NAV_ITEMS_BY_KEY = new Map(TOP_NAV_ITEMS.map((item) => [item.key, item]));
const IMMERSIVE_ROUTE_PREFIXES = ['/agents', '/ingest', '/library', '/reports', '/today'];

export function isTopNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
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

export function isImmersiveAppRoute(pathname: string): boolean {
  return IMMERSIVE_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
