'use client';

import type { FormEvent, RefObject } from 'react';
import { Dialog, getOverlayActionClassName } from '@/app/components/OverlaySurface';

type Props = {
  open: boolean;
  formId: string;
  inputRef: RefObject<HTMLInputElement | null>;
  name: string;
  error: string | null;
  isPending: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onCreate: () => void;
};

export function CreateCollectionDialog({
  open,
  formId,
  inputRef,
  name,
  error,
  isPending,
  onClose,
  onNameChange,
  onCreate,
}: Props) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onCreate();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create collection"
      description="Group related library documents without changing the underlying records."
      initialFocusRef={inputRef}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={getOverlayActionClassName('secondary')}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            className={getOverlayActionClassName('primary')}
            disabled={isPending}
          >
            {isPending ? 'Working...' : 'Create collection'}
          </button>
        </>
      }
    >
      <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="collection-name" className="mb-2 block text-sm font-medium text-zinc-200">
            Name
          </label>
          <input
            ref={inputRef}
            id="collection-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Weekly research queue"
            className="w-full rounded-2xl border border-white/[0.08] bg-[#111111] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#676161] focus:border-white/[0.12] focus:bg-[#1a1a1a]"
            disabled={isPending}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-[#f2c7bc]">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
