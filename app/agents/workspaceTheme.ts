export const workspaceShellPanelClassName =
  'rounded-[28px] border border-white/[0.08] bg-[rgba(20,22,24,0.78)] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl';

export const workspaceSurfaceClassName =
  'rounded-[24px] border border-white/[0.06] bg-[rgba(255,255,255,0.03)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';

export const workspaceInsetSurfaceClassName =
  'rounded-[22px] border border-white/[0.06] bg-[rgba(10,12,14,0.52)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]';

export const workspaceEyebrowClassName =
  'text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--surface-text-muted)]';

export const workspaceLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--surface-text-muted)]';

export const workspaceMutedCopyClassName =
  'text-sm leading-6 text-[color:var(--surface-text-muted)]';

export const workspacePillClassName =
  'inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--shell-immersive-text)]';

export const workspacePrimaryButtonClassName =
  'inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--surface-accent-ink)] px-5 text-sm font-semibold text-white transition-[background-color,box-shadow] shadow-[0_16px_32px_rgba(0,0,0,0.24)] hover:bg-[color:var(--surface-accent-ink-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214] disabled:cursor-not-allowed disabled:opacity-60';

export const workspaceSecondaryButtonClassName =
  'inline-flex h-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.03] px-5 text-sm font-semibold text-[color:var(--shell-immersive-text)] transition-[background-color,border-color,color] hover:border-white/[0.18] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214] disabled:cursor-not-allowed disabled:opacity-60';

export const workspaceInputClassName =
  'h-11 w-full rounded-[16px] border border-white/[0.1] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[color:var(--shell-immersive-text)] transition-[border-color,background-color,box-shadow] placeholder:text-white/35 hover:border-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214]';

export const workspaceTextareaClassName =
  'min-h-[140px] w-full rounded-[20px] border border-white/[0.1] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm leading-6 text-[color:var(--shell-immersive-text)] transition-[border-color,background-color,box-shadow] placeholder:text-white/35 hover:border-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214]';

export function workspacePrimaryNavClassName(active: boolean) {
  return [
    'flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition-[background-color,color,box-shadow]',
    active
      ? 'bg-[color:var(--surface-accent-ink)] text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)]'
      : 'text-[color:var(--surface-text-muted)] hover:bg-white/[0.05] hover:text-[color:var(--shell-immersive-text)]',
  ].join(' ');
}

export function workspaceUtilityNavClassName(active: boolean) {
  return [
    'inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color]',
    active
      ? 'border-[color:var(--surface-accent-strong)] bg-[rgba(132,174,186,0.14)] text-[color:var(--shell-immersive-text)]'
      : 'border-white/[0.1] bg-white/[0.03] text-[color:var(--surface-text-muted)] hover:border-white/[0.18] hover:text-[color:var(--shell-immersive-text)]',
  ].join(' ');
}

export function workspaceSectionLinkClassName(compact = false) {
  return [
    'flex items-center gap-3 rounded-[18px] border border-transparent text-left transition-[background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214]',
    compact
      ? 'min-w-max px-3.5 py-2.5 text-sm font-medium text-[color:var(--shell-immersive-text)] hover:border-white/[0.1] hover:bg-white/[0.04]'
      : 'px-4 py-3 text-sm font-medium text-[color:var(--shell-immersive-text)] hover:border-white/[0.1] hover:bg-white/[0.04]',
  ].join(' ');
}
