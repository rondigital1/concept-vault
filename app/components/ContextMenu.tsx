'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSaveToLibrary: () => void;
}

export function ContextMenu({ x, y, onClose, onSaveToLibrary }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    setPosition({ x, y });
  }, [x, y]);

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

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }

    const nextLeft = Math.max(12, Math.min(x, window.innerWidth - menu.offsetWidth - 12));
    const nextTop = Math.max(12, Math.min(y, window.innerHeight - menu.offsetHeight - 12));
    setPosition({ x: nextLeft, y: nextTop });
    saveButtonRef.current?.focus();
  }, [x, y]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      saveButtonRef.current?.focus();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Message actions"
      tabIndex={-1}
      onKeyDown={handleMenuKeyDown}
      className="fixed z-[200] min-w-[200px] rounded-lg border border-zinc-800 bg-zinc-950 py-1 shadow-xl"
      style={{ top: position.y, left: position.x }}
    >
      <button
        ref={saveButtonRef}
        type="button"
        role="menuitem"
        onClick={() => {
          onSaveToLibrary();
          onClose();
        }}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-800"
      >
        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        <span>Save to Library</span>
      </button>
    </div>
  );
}
