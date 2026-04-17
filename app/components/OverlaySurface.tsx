'use client';

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

type OverlayKind = 'dialog' | 'drawer';
type OverlayActionTone = 'primary' | 'secondary' | 'danger';

type OverlaySurfaceProps = {
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

type ConfirmDialogProps = {
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

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    return element.offsetParent !== null || element === document.activeElement;
  });
}

export function getOverlayActionClassName(tone: OverlayActionTone) {
  if (tone === 'danger') {
    return 'inline-flex items-center justify-center rounded-full bg-[#8b3f3f] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-white transition-colors motion-reduce:transition-none hover:bg-[#a64d4d] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500';
  }

  if (tone === 'secondary') {
    return 'inline-flex items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.03] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#ddd7d7] transition-colors motion-reduce:transition-none hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.02] disabled:text-zinc-500';
  }

  return 'inline-flex items-center justify-center rounded-full bg-[#d97757] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-white transition-colors motion-reduce:transition-none hover:bg-[#c66849] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500';
}

export function OverlaySurface({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  kind = 'dialog',
  initialFocusRef,
  closeLabel,
  panelClassName,
  contentClassName,
  dismissOnOverlayClick = true,
}: OverlaySurfaceProps) {
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const node = document.createElement('div');
    node.dataset.overlaySurface = kind;
    document.body.appendChild(node);
    setPortalNode(node);

    return () => {
      node.remove();
      setPortalNode(null);
    };
  }, [kind]);

  useEffect(() => {
    if (!open || !portalNode || typeof document === 'undefined') {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const siblings = Array.from(document.body.children).filter(
      (element) => element !== portalNode,
    ) as HTMLElement[];
    const previousState = siblings.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute('aria-hidden'),
    }));

    siblings.forEach((element) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });

    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => {
      const preferredFocus = initialFocusRef?.current;
      if (preferredFocus) {
        preferredFocus.focus();
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusable = getFocusableElements(panel);
      (focusable[0] ?? panel).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;

      previousState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
      });

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [initialFocusRef, onClose, open, portalNode]);

  if (!open || !portalNode) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label={closeLabel ?? `Close ${kind === 'drawer' ? 'drawer' : 'dialog'}`}
        className="absolute inset-0 bg-zinc-950/86 backdrop-blur-[2px]"
        onClick={() => {
          if (dismissOnOverlayClick) {
            onClose();
          }
        }}
        tabIndex={-1}
      />

      <div
        className={
          kind === 'drawer'
            ? 'relative ml-auto flex h-full w-full max-w-xl items-stretch justify-end'
            : 'relative flex w-full items-center justify-center'
        }
      >
        <section
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cx(
            'relative flex w-full flex-col overflow-hidden border border-white/[0.08] bg-[#181818] text-[#ece9e8] shadow-[0_24px_80px_rgba(0,0,0,0.45)] outline-none animate-panel-fade motion-reduce:animate-none',
            kind === 'drawer'
              ? 'h-full max-w-lg rounded-none border-l border-white/[0.08] sm:rounded-l-[28px]'
              : 'max-w-lg rounded-[28px]',
            panelClassName,
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-6 py-5 sm:px-7">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-white">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm leading-6 text-zinc-400">
                  {description}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel ?? `Close ${kind === 'drawer' ? 'drawer' : 'dialog'}`}
              className="rounded-full p-2 text-zinc-500 transition-colors motion-reduce:transition-none hover:bg-white/[0.05] hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </header>

          <div className={cx('flex-1 overflow-y-auto px-6 py-6 sm:px-7', contentClassName)}>
            {children}
          </div>

          {footer ? (
            <footer className="flex flex-wrap justify-end gap-3 border-t border-white/[0.08] px-6 py-5 sm:px-7">
              {footer}
            </footer>
          ) : null}
        </section>
      </div>
    </div>,
    portalNode,
  );
}

export function Dialog(props: Omit<OverlaySurfaceProps, 'kind'>) {
  return <OverlaySurface {...props} kind="dialog" />;
}

export function Drawer(props: Omit<OverlaySurfaceProps, 'kind'>) {
  return <OverlaySurface {...props} kind="drawer" />;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'danger',
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
      title={title}
      description={description}
      closeLabel={`Close ${title.toLowerCase()}`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={getOverlayActionClassName('secondary')}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={getOverlayActionClassName(confirmTone)}
            disabled={busy}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </>
      }
    >
      {children ? <div className="text-sm leading-6 text-zinc-300">{children}</div> : null}
    </Dialog>
  );
}
