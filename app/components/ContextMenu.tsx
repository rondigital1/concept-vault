'use client';

import { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSaveToLibrary: () => void;
}

export function ContextMenu({ x, y, onClose, onSaveToLibrary }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[200px] rounded-lg border border-white/10 bg-zinc-950 py-1 shadow-xl"
      style={{ top: y, left: x }}
    >
      <button
        onClick={() => {
          onSaveToLibrary();
          onClose();
        }}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-zinc-200 transition-colors hover:bg-white/5"
      >
        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        <span>Save to Library</span>
      </button>
    </div>
  );
}
