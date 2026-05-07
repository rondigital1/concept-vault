import { dismissToast } from './toastStore';
import { getToastVisualTheme, TOAST_ICONS, TOAST_LABELS } from './toastTheme';
import type { Toast, ToastSkin } from './toastTypes';

type Props = {
  toasts: Toast[];
  skin: ToastSkin;
  className?: string;
};

export function ToastList({ toasts, skin, className = '' }: Props) {
  return (
    <div
      className={`pointer-events-none fixed right-4 top-20 z-50 flex max-w-sm flex-col gap-3 ${className}`}
    >
      {toasts.map((toastRecord) => (
        <ToastItem key={toastRecord.id} toastRecord={toastRecord} skin={skin} />
      ))}
    </div>
  );
}

function ToastItem({ toastRecord, skin }: { toastRecord: Toast; skin: ToastSkin }) {
  const theme = getToastVisualTheme(toastRecord.type, skin);

  return (
    <div
      className={`pointer-events-auto animate-slide-in-right rounded-2xl border px-4 py-3 text-white shadow-[0_22px_48px_rgba(0,0,0,0.35)] motion-reduce:animate-none ${theme.panel}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${theme.iconWrap}`}
        >
          {TOAST_ICONS[toastRecord.type]}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
            {TOAST_LABELS[toastRecord.type]}
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-white">{toastRecord.message}</p>
        </div>

        <button
          type="button"
          onClick={() => dismissToast(toastRecord.id)}
          aria-label={`Dismiss ${TOAST_LABELS[toastRecord.type].toLowerCase()} notification`}
          className={`rounded-full p-2 transition-colors motion-reduce:transition-none ${theme.dismiss}`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
