'use client';

import { useSyncExternalStore } from 'react';
import { ToastList } from './ToastList';
import { ToastLiveRegions } from './ToastLiveRegions';
import {
  addToast,
  clearToasts,
  dismissToast,
  getToastSnapshot,
  resetToastState,
  subscribeToasts,
  toast,
} from './toastStore';
import { getToastAnnouncementText, getToastVisualTheme } from './toastTheme';
import type { ToastSkin } from './toastTypes';

export {
  addToast,
  clearToasts,
  dismissToast,
  getToastAnnouncementText,
  getToastSnapshot,
  getToastVisualTheme,
  resetToastState,
  subscribeToasts,
  toast,
};
export type { Toast, ToastOptions, ToastSkin, ToastType } from './toastTypes';

export function ToastContainer({
  skin = 'default',
  className = '',
}: {
  skin?: ToastSkin;
  className?: string;
}) {
  const toasts = useSyncExternalStore(subscribeToasts, getToastSnapshot, getToastSnapshot);

  return (
    <>
      <ToastLiveRegions toasts={toasts} />
      <ToastList toasts={toasts} skin={skin} className={className} />
    </>
  );
}
