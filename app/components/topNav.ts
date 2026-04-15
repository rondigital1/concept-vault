export type TopNavItem = {
  href: string;
  label: string;
};

export const TOP_NAV_ITEMS: TopNavItem[] = [
  { href: '/today', label: 'Research' },
  { href: '/agents', label: 'Agents' },
  { href: '/library', label: 'Library' },
  { href: '/reports', label: 'Reports' },
  { href: '/ingest', label: 'Add Content' },
  { href: '/chat', label: 'Ask Vault' },
];

export function isTopNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
