import type { Toast, ToastOptions, ToastType } from './toastTypes';

let toastCounter = 0;
const toastListeners = new Set<() => void>();
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();
let currentToasts: Toast[] = [];

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

export const toast = {
  success: (message: string, options?: ToastOptions) => addToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => addToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => addToast(message, 'info', options),
  warning: (message: string, options?: ToastOptions) => addToast(message, 'warning', options),
  dismiss: (id: string) => dismissToast(id),
  clear: () => clearToasts(),
};
