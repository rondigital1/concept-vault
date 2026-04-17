import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  message,
  icon,
  actions,
  className = '',
}: {
  title?: string;
  description?: string;
  message?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const body = description ?? message;

  return (
    <section
      className={`rounded-[24px] border border-white/[0.08] bg-[rgba(20,20,20,0.88)] p-12 text-center shadow-[0_18px_50px_rgba(0,0,0,0.24)] ${className}`}
    >
      {icon ? (
        <div aria-hidden="true" className="mb-4 text-4xl text-zinc-300">
          {icon}
        </div>
      ) : null}
      {title ? <h3 className="text-lg font-semibold text-white">{title}</h3> : null}
      {body ? <p className="mt-2 text-sm leading-7 text-zinc-400">{body}</p> : null}
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </section>
  );
}
