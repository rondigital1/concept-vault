'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
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
        className="absolute inset-0 bg-black/52 backdrop-blur-[4px]"
      />
      <aside className="today-panel today-panel-high today-glass absolute inset-y-0 right-0 z-10 flex w-full max-w-[560px] flex-col rounded-none rounded-l-[28px]">
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={sectionLabelClass}>Secondary context</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--today-text)]">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-[color:var(--today-muted)]">{description}</p>
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
