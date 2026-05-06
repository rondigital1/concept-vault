export type IngestMode = 'file' | 'url' | 'text';

export type FeedbackTone = 'default' | 'loading' | 'success' | 'error';

export type FeedbackState = {
  tone: FeedbackTone;
  eyebrow: string;
  title: string;
  description: string;
};

export type IngestWorkspaceDocument = {
  id: string;
  title: string;
  source: string;
  imported_at: string;
  is_webscout_discovered: boolean;
};

export type IngestWorkspaceStats = {
  totalRecords: number;
  directImports: number;
  researchImports: number;
  favorites: number;
  cleanupCandidates: number;
};

export type ModeConfig = {
  label: string;
  title: string;
  description: string;
  actionLabel: string;
  footerNote: string;
  helper: string;
};

export type IngestIconName =
  | 'terminal'
  | 'brain'
  | 'database'
  | 'network'
  | 'settings'
  | 'bell'
  | 'file'
  | 'link'
  | 'article'
  | 'upload'
  | 'filter'
  | 'search'
  | 'list'
  | 'logout'
  | 'check'
  | 'warning';
