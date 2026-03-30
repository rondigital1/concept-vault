export function SectionHeader({
  title,
  count,
  countId,
}: {
  title: string;
  count?: number;
  countId?: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
      {title}
      {typeof count === 'number' && (
        <span
          id={countId}
          className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-medium tracking-normal text-zinc-100"
        >
          {count}
        </span>
      )}
    </h2>
  );
}
