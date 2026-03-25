type StatusBadgeProps = {
  status: string;
  label?: string;
  className?: string;
};

const STATUS_THEMES: Record<string, string> = {
  running: 'border-amber-300/35 bg-amber-300/10 text-amber-200',
  ok: 'border-emerald-300/35 bg-emerald-300/10 text-emerald-200',
  error: 'border-rose-300/35 bg-rose-300/10 text-rose-200',
  partial: 'border-yellow-300/35 bg-yellow-300/10 text-yellow-200',
  proposed: 'border-sky-300/35 bg-sky-300/10 text-sky-200',
  approved: 'border-emerald-300/35 bg-emerald-300/10 text-emerald-200',
  rejected: 'border-zinc-300/25 bg-zinc-300/10 text-zinc-200',
  active: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-200',
  skipped: 'border-zinc-300/20 bg-zinc-300/10 text-zinc-300',
  pending: 'border-zinc-700 bg-zinc-800 text-zinc-300',
  done: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
};

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const tone = STATUS_THEMES[status] ?? STATUS_THEMES.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone} ${className}`}
    >
      {status === 'running' && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      )}
      {label ?? status}
    </span>
  );
}
