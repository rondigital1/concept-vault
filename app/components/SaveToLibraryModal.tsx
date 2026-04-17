'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Dialog, getOverlayActionClassName } from './OverlaySurface';

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
  const formId = useId();
  const previewLabelId = useId();

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      const frame = window.requestAnimationFrame(() => {
        inputRef.current?.select();
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
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

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Save to Library"
      description="Store this answer as a new document."
      initialFocusRef={inputRef}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={getOverlayActionClassName('secondary')}
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={!title.trim()}
            className={getOverlayActionClassName('primary')}
          >
            Save to Library
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Enter a title for this content"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none transition-all placeholder:text-zinc-500 focus:border-transparent focus:ring-2 focus:ring-[#d97757]"
            />
          </div>

          <div
            className="max-h-32 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-3"
            aria-labelledby={previewLabelId}
          >
            <p id={previewLabelId} className="mb-1 text-xs font-medium text-zinc-500">
              Content preview
            </p>
            <p className="line-clamp-4 text-sm text-zinc-300">{defaultText}</p>
          </div>
      </form>
    </Dialog>
  );
}
