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
        className="absolute inset-0 bg-slate-950/22 backdrop-blur-[2px]"
      />
      <aside className="absolute inset-y-0 right-0 z-10 flex w-full max-w-[560px] flex-col border-l border-[color:var(--workbench-line)] bg-[color:var(--workbench-panel)] shadow-[-24px_0_80px_rgba(43,30,20,0.16)]">
        <div className="border-b border-[color:var(--workbench-line)] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={sectionLabelClass}>Secondary context</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </aside>
    </div>
  );
}
