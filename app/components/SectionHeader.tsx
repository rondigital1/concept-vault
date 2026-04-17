import type { ReactNode } from 'react';

export function SectionHeader({
  title,
  count,
  countId,
  description,
  actions,
  className = '',
}: {
  title: string;
  count?: number;
  countId?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div>
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
          <span>{title}</span>
          {typeof count === 'number' && (
            <span
              id={countId}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] font-medium tracking-normal text-zinc-100"
            >
              {count}
            </span>
          )}
        </h2>
        {description ? <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p> : null}
      </div>

      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
