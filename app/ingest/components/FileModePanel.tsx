import type { ChangeEvent, DragEvent, KeyboardEvent, RefObject } from 'react';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_MB,
  MODE_CONFIG,
  monoInputClass,
  monoLabelClass,
} from '../constants';
import { IngestActionFooter } from './IngestActionFooter';
import { IngestField } from './IngestField';
import { IngestIcon } from './IngestIcon';

export function FileModePanel({
  dragActive,
  selectedFile,
  title,
  titlePlaceholder,
  isLoading,
  isActionDisabled,
  onTitleChange,
  onDrag,
  onDrop,
  onOpenFilePicker,
  onFileInputChange,
  onClearFile,
  onUpload,
  fileInputRef,
}: {
  dragActive: boolean;
  selectedFile: File | null;
  title: string;
  titlePlaceholder: string;
  isLoading: boolean;
  isActionDisabled: boolean;
  onTitleChange: (value: string) => void;
  onDrag: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onOpenFilePicker: () => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onUpload: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenFilePicker();
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={onOpenFilePicker}
        onKeyDown={handleKeyDown}
        className={`group relative overflow-hidden rounded-[2rem] bg-[#111111] px-6 py-12 text-center outline-none transition duration-300 sm:px-10 sm:py-16 ${
          dragActive ? 'shadow-[0_0_0_1px_rgba(193,193,193,0.24),0_0_0_20px_rgba(193,193,193,0.08)]' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={onFileInputChange}
          className="hidden"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.035),transparent_65%)]" />
        <div className="relative z-10 mx-auto max-w-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#2a2a2a] text-[#d6d1d1] transition duration-300 group-hover:scale-105">
            <IngestIcon name="upload" />
          </div>
          <h2 className="text-[2.2rem] font-bold tracking-[-0.06em] text-white">{MODE_CONFIG.file.title}</h2>
          <p className="mx-auto mt-4 max-w-md text-[1.05rem] leading-8 text-[#c4bebe]">{MODE_CONFIG.file.description}</p>

          {selectedFile ? (
            <div className="mx-auto mt-8 max-w-md rounded-[1.4rem] bg-[#1b1b1b] px-5 py-5 text-left">
              <p className={monoLabelClass}>SELECTED_FILE</p>
              <p className="mt-3 truncate text-lg font-semibold text-white">{selectedFile.name}</p>
              <p className="mt-1 text-sm text-[#8f8787]">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready for inline extraction
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClearFile();
                }}
                className="mt-4 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#bcb4b4] transition hover:text-white"
              >
                Remove file
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenFilePicker();
              }}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#f3f0f0] px-8 py-4 text-[0.84rem] font-bold uppercase tracking-[0.25em] text-[#171717] transition hover:scale-[1.015] hover:bg-white"
            >
              Browse Files
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <IngestField label="Title" optional>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={titlePlaceholder}
            className={monoInputClass}
          />
        </IngestField>
        <div className="rounded-[1.35rem] bg-[#1b1b1b] px-5 py-4">
          <p className={monoLabelClass}>ACCEPTS</p>
          <p className="mt-3 text-sm leading-7 text-[#cdc7c7]">
            {MODE_CONFIG.file.helper}
            <br />
            Up to {MAX_FILE_SIZE_MB}MB
          </p>
        </div>
      </div>

      <IngestActionFooter
        note={MODE_CONFIG.file.footerNote}
        actionLabel={MODE_CONFIG.file.actionLabel}
        disabled={isActionDisabled}
        loading={isLoading}
        onClick={onUpload}
      />
    </>
  );
}
