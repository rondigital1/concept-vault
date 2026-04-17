'use client';

import { useSyncExternalStore } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastSkin = 'default' | 'muted';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
}

type ToastOptions = {
  durationMs?: number;
};

let toastCounter = 0;
const toastListeners = new Set<() => void>();
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();
let currentToasts: Toast[] = [];

const TOAST_LABELS: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
  warning: 'Warning',
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '!',
  info: 'i',
  warning: '!',
};

const TOAST_THEMES: Record<
  ToastSkin,
  Record<ToastType, { panel: string; iconWrap: string; dismiss: string }>
> = {
  default: {
    success: {
      panel: 'border-emerald-800/80 bg-[rgba(17,47,34,0.96)]',
      iconWrap: 'border-emerald-700/80 bg-emerald-500/15 text-emerald-200',
      dismiss: 'text-emerald-100/70 hover:bg-emerald-500/10 hover:text-white',
    },
    error: {
      panel: 'border-rose-900/80 bg-[rgba(61,18,25,0.96)]',
      iconWrap: 'border-rose-800/80 bg-rose-500/15 text-rose-100',
      dismiss: 'text-rose-100/70 hover:bg-rose-500/10 hover:text-white',
    },
    info: {
      panel: 'border-sky-900/80 bg-[rgba(15,36,53,0.96)]',
      iconWrap: 'border-sky-800/80 bg-sky-500/15 text-sky-100',
      dismiss: 'text-sky-100/70 hover:bg-sky-500/10 hover:text-white',
    },
    warning: {
      panel: 'border-amber-900/80 bg-[rgba(58,40,11,0.96)]',
      iconWrap: 'border-amber-800/80 bg-amber-500/15 text-amber-100',
      dismiss: 'text-amber-100/70 hover:bg-amber-500/10 hover:text-white',
    },
  },
  muted: {
    success: {
      panel: 'border-white/[0.08] bg-[rgba(28,28,28,0.96)]',
      iconWrap: 'border-white/[0.08] bg-emerald-500/10 text-emerald-200',
      dismiss: 'text-zinc-400 hover:bg-white/[0.05] hover:text-white',
    },
    error: {
      panel: 'border-white/[0.08] bg-[rgba(28,28,28,0.96)]',
      iconWrap: 'border-white/[0.08] bg-rose-500/10 text-rose-100',
      dismiss: 'text-zinc-400 hover:bg-white/[0.05] hover:text-white',
    },
    info: {
      panel: 'border-white/[0.08] bg-[rgba(28,28,28,0.96)]',
      iconWrap: 'border-white/[0.08] bg-sky-500/10 text-sky-100',
      dismiss: 'text-zinc-400 hover:bg-white/[0.05] hover:text-white',
    },
    warning: {
      panel: 'border-white/[0.08] bg-[rgba(28,28,28,0.96)]',
      iconWrap: 'border-white/[0.08] bg-amber-500/10 text-amber-100',
      dismiss: 'text-zinc-400 hover:bg-white/[0.05] hover:text-white',
    },
  },
};

function emitToasts() {
  toastListeners.forEach((listener) => listener());
}

export function subscribeToasts(listener: () => void) {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export function getToastSnapshot() {
  return currentToasts;
}

export function getToastAnnouncementText(toastRecord: Pick<Toast, 'message' | 'type'>) {
  return `${TOAST_LABELS[toastRecord.type]}: ${toastRecord.message}`;
}

export function getToastVisualTheme(type: ToastType, skin: ToastSkin = 'default') {
  return TOAST_THEMES[skin][type];
}

export const toast = {
  success: (message: string, options?: ToastOptions) => addToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => addToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => addToast(message, 'info', options),
  warning: (message: string, options?: ToastOptions) => addToast(message, 'warning', options),
  dismiss: (id: string) => dismissToast(id),
  clear: () => clearToasts(),
};

export function dismissToast(id: string) {
  const timer = toastTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    toastTimers.delete(id);
  }

  currentToasts = currentToasts.filter((toastRecord) => toastRecord.id !== id);
  emitToasts();
}

export function clearToasts() {
  toastTimers.forEach((timer) => clearTimeout(timer));
  toastTimers.clear();
  currentToasts = [];
  emitToasts();
}

export function resetToastState() {
  toastCounter = 0;
  clearToasts();
}

export function addToast(message: string, type: ToastType, options: ToastOptions = {}) {
  const id = `toast-${++toastCounter}`;
  const durationMs = options.durationMs ?? 4000;
  const newToast = { id, message, type, durationMs };
  currentToasts = [...currentToasts, newToast];
  emitToasts();

  const timer = setTimeout(() => {
    dismissToast(id);
  }, durationMs);
  toastTimers.set(id, timer);

  return id;
}

export function ToastContainer({
  skin = 'default',
  className = '',
}: {
  skin?: ToastSkin;
  className?: string;
}) {
  const toasts = useSyncExternalStore(subscribeToasts, getToastSnapshot, getToastSnapshot);
  const politeToasts = toasts.filter((toastRecord) => toastRecord.type !== 'error');
  const assertiveToasts = toasts.filter((toastRecord) => toastRecord.type === 'error');

  return (
    <>
      <div className="sr-only">
        <div aria-live="polite" aria-atomic="false" aria-relevant="additions text">
          {politeToasts.map((toastRecord) => (
            <p key={toastRecord.id}>{getToastAnnouncementText(toastRecord)}</p>
          ))}
        </div>
        <div aria-live="assertive" aria-atomic="false" aria-relevant="additions text">
          {assertiveToasts.map((toastRecord) => (
            <p key={toastRecord.id}>{getToastAnnouncementText(toastRecord)}</p>
          ))}
        </div>
      </div>

      <div
        className={`pointer-events-none fixed right-4 top-20 z-50 flex max-w-sm flex-col gap-3 ${className}`}
      >
        {toasts.map((toastRecord) => {
          const theme = getToastVisualTheme(toastRecord.type, skin);

          return (
            <div
              key={toastRecord.id}
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
                  <p className="mt-1 text-sm font-medium leading-6 text-white">
                    {toastRecord.message}
                  </p>
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
        })}
      </div>
    </>
  );
}
