export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastSkin = 'default' | 'muted';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
}

export type ToastOptions = {
  durationMs?: number;
};
