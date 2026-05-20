export type ResultsIconName =
  | 'analytics'
  | 'archive'
  | 'arrow-left'
  | 'arrow-up-right'
  | 'bell'
  | 'chat'
  | 'check'
  | 'close'
  | 'external'
  | 'library'
  | 'plus'
  | 'report'
  | 'research'
  | 'settings'
  | 'stack';

export type ResultsNavKey = 'reports' | 'research' | 'library' | 'chat';
export type ResultsPillTone = 'muted' | 'inverse' | 'success' | 'warning' | 'danger' | 'info';
export type ResultsActionTone = 'primary' | 'secondary' | 'success' | 'danger';

export type ResultsNavItem = {
  key: ResultsNavKey;
  label: string;
  href: string;
  icon: ResultsIconName;
};
