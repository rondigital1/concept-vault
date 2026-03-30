export function EmptyState({
  title,
  description,
  message,
  icon,
  className = '',
}: {
  title?: string;
  description?: string;
  message?: string;
  icon?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-dashed border-zinc-800 bg-zinc-900 p-12 text-center ${className}`}
    >
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      {title && <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>}
      {description && <p className="text-sm text-zinc-400">{description}</p>}
      {message && <p className="text-sm text-zinc-400">{message}</p>}
    </div>
  );
}
