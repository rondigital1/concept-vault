export const KIND_LABELS: Record<string, string> = {
  'web-proposal': 'Source candidate',
  concept: 'Concept',
  flashcard: 'Flashcard',
  'research-report': 'Report',
};

export const KIND_THEMES: Record<string, string> = {
  'web-proposal': 'border-amber-800 bg-amber-950 text-amber-200',
  concept: 'border-emerald-800 bg-emerald-950 text-emerald-200',
  flashcard: 'border-sky-800 bg-sky-950 text-sky-200',
  'research-report': 'border-rose-800 bg-rose-950 text-rose-200',
};

export const KIND_ACCENT_BORDERS: Record<string, string> = {
  'web-proposal': 'border-l-amber-500',
  concept: 'border-l-emerald-500',
  flashcard: 'border-l-sky-500',
  'research-report': 'border-l-rose-500',
};

function formatTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function KindBadge({ kind }: { kind: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${KIND_THEMES[kind] ?? 'border-zinc-700 bg-zinc-900 text-zinc-200'}`}
    >
      {KIND_LABELS[kind] ?? formatTitleCase(kind)}
    </span>
  );
}
