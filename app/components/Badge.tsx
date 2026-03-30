export function Badge({
  children,
  variant = 'default',
  className = ''
}: {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'secondary' | 'accent' | 'info';
  className?: string;
}) {
  const variants = {
    default: 'border-gray-200 bg-white text-gray-700',
    primary: 'border-blue-200 bg-blue-50 text-blue-700',
    success: 'border-green-200 bg-green-50 text-green-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    secondary: 'border-zinc-700 bg-zinc-900 text-zinc-400',
    accent: 'border-[#5a3020] bg-[#2a1810] text-[#d97757]',
    info: 'border-sky-800 bg-sky-950 text-sky-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
