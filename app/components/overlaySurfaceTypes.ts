import type { ReactNode, RefObject } from 'react';

export type OverlayKind = 'dialog' | 'drawer';
export type OverlayActionTone = 'primary' | 'secondary' | 'danger';

export type OverlaySurfaceProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  kind?: OverlayKind;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeLabel?: string;
  panelClassName?: string;
  contentClassName?: string;
  dismissOnOverlayClick?: boolean;
};

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: Extract<OverlayActionTone, 'primary' | 'danger'>;
  busy?: boolean;
};
