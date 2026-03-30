type StatusBadgeProps = {
  status: string;
  label?: string;
  className?: string;
};

const STATUS_THEMES: Record<string, string> = {
  running: 'border-amber-800 bg-amber-950 text-amber-200',
  ok: 'border-emerald-800 bg-emerald-950 text-emerald-200',
  error: 'border-rose-800 bg-rose-950 text-rose-200',
  partial: 'border-yellow-800 bg-yellow-950 text-yellow-200',
  proposed: 'border-sky-800 bg-sky-950 text-sky-200',
  approved: 'border-emerald-800 bg-emerald-950 text-emerald-200',
  rejected: 'border-zinc-700 bg-zinc-800 text-zinc-200',
  active: 'border-cyan-800 bg-cyan-950 text-cyan-200',
  skipped: 'border-zinc-700 bg-zinc-800 text-zinc-300',
  pending: 'border-zinc-700 bg-zinc-800 text-zinc-300',
  done: 'border-emerald-800 bg-emerald-950 text-emerald-200',
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
