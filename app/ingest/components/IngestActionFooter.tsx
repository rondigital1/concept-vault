import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export function IngestActionFooter({
  actionLabel,
  note,
  disabled,
  loading,
  onClick,
}: {
  actionLabel: string;
  note: string;
  disabled: boolean;
  loading: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <p className="max-w-2xl text-sm leading-7 text-[#a19b9b]">{note}</p>
      <button
        type={onClick ? 'button' : 'submit'}
        onClick={onClick}
        disabled={disabled || loading}
        className={`inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-full px-5 py-3 text-center text-[0.76rem] font-bold uppercase tracking-[0.16em] transition sm:w-auto sm:min-w-[172px] sm:px-6 sm:text-[0.8rem] sm:tracking-[0.22em] ${
          disabled || loading
            ? 'cursor-not-allowed bg-[#252525] text-[#6f6a6a]'
            : 'bg-[#f3f0f0] text-[#171717] hover:scale-[1.015] hover:bg-white'
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner className="h-4 w-4 border-[#525252] border-t-[#111111]" />
            Working
          </span>
        ) : (
          actionLabel
        )}
      </button>
    </div>
  );
}
