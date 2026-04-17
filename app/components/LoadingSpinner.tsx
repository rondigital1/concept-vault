type LoadingSpinnerProps = {
  className?: string;
  label?: string;
};

export function LoadingSpinner({ className, label }: LoadingSpinnerProps) {
  return (
    <span
      className="inline-flex items-center"
      role={label ? 'status' : undefined}
      aria-live={label ? 'polite' : undefined}
    >
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-2 motion-reduce:animate-none ${className ?? ''}`}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
