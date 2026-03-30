export function CountChip({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'attention' | 'success';
}) {
  const tones: Record<string, string> = {
    default: 'border-zinc-700 bg-zinc-900 text-zinc-200',
    attention: 'border-amber-800 bg-amber-950 text-amber-100',
    success: 'border-emerald-800 bg-emerald-950 text-emerald-100',
  };

  return (
    <div className={`rounded-full border px-3 py-1 text-xs ${tones[tone]}`}>
      <span className="font-semibold text-white">{value}</span> {label}
    </div>
  );
}
