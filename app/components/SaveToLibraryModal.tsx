'use client';

import { useState, useRef, useEffect } from 'react';

interface SaveToLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
  defaultText: string;
  defaultTitle: string;
}

export function SaveToLibraryModal({
  isOpen,
  onClose,
  onSave,
  defaultText,
  defaultTitle,
}: SaveToLibraryModalProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    } else {
      setTitle('');
    }
  }, [isOpen, defaultTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && defaultText.trim()) {
      onSave(title.trim(), defaultText);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Save to Library</h3>
            <p className="mt-1 text-sm text-zinc-500">Store this answer as a new document.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-medium text-zinc-200">
              Title
            </label>
            <input
              ref={inputRef}
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a title for this content"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-zinc-100 outline-none transition-all placeholder:text-zinc-500 focus:border-transparent focus:ring-2 focus:ring-[#d97757]"
            />
          </div>

          <div className="max-h-32 overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-3">
            <p className="mb-1 text-xs font-medium text-zinc-500">Content preview</p>
            <p className="line-clamp-4 text-sm text-zinc-300">{defaultText}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 rounded-lg bg-[#d97757] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#c66849] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              Save to Library
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
