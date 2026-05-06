import { MODE_CONFIG, monoInputClass, monoLabelClass } from '../constants';
import { IngestActionFooter } from './IngestActionFooter';
import { IngestField } from './IngestField';
import { IngestIcon } from './IngestIcon';

export function UrlModePanel({
  title,
  source,
  titlePlaceholder,
  isLoading,
  isActionDisabled,
  onTitleChange,
  onSourceChange,
}: {
  title: string;
  source: string;
  titlePlaceholder: string;
  isLoading: boolean;
  isActionDisabled: boolean;
  onTitleChange: (value: string) => void;
  onSourceChange: (value: string) => void;
}) {
  return (
    <>
      <div className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_62%)]" />
        <div className="relative z-10">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2a2a] text-[#d6d1d1]">
            <IngestIcon name="link" />
          </div>
          <h2 className="text-[2.1rem] font-bold tracking-[-0.06em] text-white">{MODE_CONFIG.url.title}</h2>
          <p className="mt-3 max-w-xl text-[1.02rem] leading-8 text-[#c4bebe]">{MODE_CONFIG.url.description}</p>

          <div className="mt-8 space-y-5">
            <IngestField label="Title" optional>
              <input
                type="text"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder={titlePlaceholder}
                className={monoInputClass}
              />
            </IngestField>

            <IngestField label="URL">
              <input
                type="url"
                value={source}
                onChange={(event) => onSourceChange(event.target.value)}
                placeholder="https://example.com/article"
                className={monoInputClass}
                required
              />
            </IngestField>

            <div className="rounded-[1.35rem] bg-[#1b1b1b] px-5 py-4">
              <p className={monoLabelClass}>CAPTURE_POLICY</p>
              <p className="mt-3 text-sm leading-7 text-[#cdc7c7]">
                Public articles and docs pages are fetched inline. Explicit approval is still required before any WebScout proposal becomes active.
              </p>
            </div>
          </div>
        </div>
      </div>

      <IngestActionFooter
        note={MODE_CONFIG.url.footerNote}
        actionLabel={MODE_CONFIG.url.actionLabel}
        disabled={isActionDisabled}
        loading={isLoading}
      />
    </>
  );
}
