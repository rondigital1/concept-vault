'use client';

import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import { sectionLabelClass, secondaryButtonClass } from './WorkspaceHeaderPrimitives';

type Props = {
  title: string;
  description: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function MetadataDrawer({ title, description, isOpen, onClose, children }: Props) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="today-panel today-panel-high today-glass absolute inset-x-0 bottom-0 top-[10vh] z-10 flex flex-col rounded-t-[28px] sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:max-w-[560px] sm:rounded-none sm:rounded-l-[28px]"
      >
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={sectionLabelClass}>Secondary context</p>
              <h2 id={titleId} className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--today-text)]">
                {title}
              </h2>
              <p id={descriptionId} className="mt-2 text-sm leading-7 text-[color:var(--today-muted)]">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`${secondaryButtonClass} h-10 w-10 px-0`}
            >
              ×
            </button>
          </div>
        </div>

        <div className="today-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </aside>
    </div>
  );
}
