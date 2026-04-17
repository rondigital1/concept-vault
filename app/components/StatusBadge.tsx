type StatusBadgeProps = {
  status: string;
  label?: string;
  className?: string;
};

type StatusTone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const STATUS_THEMES: Record<StatusTone, string> = {
  default: 'border-zinc-700 bg-zinc-900 text-zinc-200',
  success: 'border-emerald-800 bg-emerald-950 text-emerald-200',
  warning: 'border-amber-800 bg-amber-950 text-amber-200',
  danger: 'border-rose-800 bg-rose-950 text-rose-200',
  info: 'border-sky-800 bg-sky-950 text-sky-200',
  muted: 'border-zinc-700 bg-zinc-800 text-zinc-300',
};

export function resolveStatusTone(status: string): StatusTone {
  switch (status) {
    case 'running':
    case 'partial':
    case 'warning':
      return 'warning';
    case 'ok':
    case 'approved':
    case 'done':
      return 'success';
    case 'error':
    case 'danger':
      return 'danger';
    case 'proposed':
    case 'active':
    case 'info':
      return 'info';
    case 'rejected':
    case 'skipped':
    case 'pending':
      return 'muted';
    default:
      return 'default';
  }
}

export function formatStatusLabel(status: string) {
  return status
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const tone = STATUS_THEMES[resolveStatusTone(status)];
  const renderedLabel = label ?? formatStatusLabel(status);

  return (
    <span
      aria-label={renderedLabel}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone} ${className}`}
    >
      {status === 'running' && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 animate-status-pulse rounded-full bg-amber-400"
        />
      )}
      {renderedLabel}
    </span>
  );
}
