import {
  MODE_CONFIG,
  monoInputClass,
  monoTextareaClass,
} from '../constants';
import { IngestActionFooter } from './IngestActionFooter';
import { IngestField } from './IngestField';
import { IngestIcon } from './IngestIcon';

export function TextModePanel({
  title,
  source,
  content,
  titlePlaceholder,
  isLoading,
  isActionDisabled,
  onTitleChange,
  onSourceChange,
  onContentChange,
}: {
  title: string;
  source: string;
  content: string;
  titlePlaceholder: string;
  isLoading: boolean;
  isActionDisabled: boolean;
  onTitleChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onContentChange: (value: string) => void;
}) {
  return (
    <>
      <div className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_62%)]" />
        <div className="relative z-10">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2a2a] text-[#d6d1d1]">
            <IngestIcon name="article" />
          </div>
          <h2 className="text-[2.1rem] font-bold tracking-[-0.06em] text-white">{MODE_CONFIG.text.title}</h2>
          <p className="mt-3 max-w-xl text-[1.02rem] leading-8 text-[#c4bebe]">{MODE_CONFIG.text.description}</p>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <IngestField label="Title" optional>
              <input
                type="text"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder={titlePlaceholder}
                className={monoInputClass}
              />
            </IngestField>
            <IngestField label="Source" optional>
              <input
                type="text"
                value={source}
                onChange={(event) => onSourceChange(event.target.value)}
                placeholder="Book, transcript, or where this came from"
                className={monoInputClass}
              />
            </IngestField>
          </div>

          <div className="mt-5">
            <IngestField label="Content">
              <textarea
                value={content}
                onChange={(event) => onContentChange(event.target.value)}
                placeholder={'Paste your content here.\n\nMarkdown is supported for headings, lists, links, and code.'}
                className={monoTextareaClass}
                required
              />
            </IngestField>
            <div className="mt-3 flex flex-col gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-[#8f8787] sm:flex-row sm:items-center sm:justify-between">
              <span>
                {content.length} characters
                {content.length < 50 ? ` • ${50 - content.length} more needed` : ''}
              </span>
              <span>{MODE_CONFIG.text.helper}</span>
            </div>
          </div>
        </div>
      </div>

      <IngestActionFooter
        note={MODE_CONFIG.text.footerNote}
        actionLabel={MODE_CONFIG.text.actionLabel}
        disabled={isActionDisabled}
        loading={isLoading}
      />
    </>
  );
}
