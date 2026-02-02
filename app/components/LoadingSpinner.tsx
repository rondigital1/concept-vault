type LoadingSpinnerProps = {
  className?: string;
};

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div className={`animate-spin rounded-full border-2 ${className ?? ''}`} />
  );
}
