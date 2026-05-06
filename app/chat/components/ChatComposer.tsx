'use client';

import type { Dispatch, KeyboardEvent, RefObject, SetStateAction } from 'react';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { cx } from '../chatPresentation';
import { AskVaultIcon } from './AskVaultIcon';

export function ChatComposer({
  suggestions,
  showIntroState,
  isRefreshingSuggestions,
  message,
  isLoading,
  textareaRef,
  setMessage,
  onKeyDown,
  onSubmitPrompt,
  onRefreshSuggestions,
}: {
  suggestions: string[];
  showIntroState: boolean;
  isRefreshingSuggestions: boolean;
  message: string;
  isLoading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  setMessage: Dispatch<SetStateAction<string>>;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmitPrompt: (prompt?: string) => void;
  onRefreshSuggestions: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:left-[18.75rem] xl:right-[20rem]">
      <div className="bg-[linear-gradient(to_top,rgba(19,19,19,0.98),rgba(19,19,19,0.96),transparent)] px-4 pb-5 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1020px] pointer-events-auto">
          {suggestions.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              {suggestions.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => {
                    onSubmitPrompt(reply);
                  }}
                  className="rounded-full bg-[#1a1a1a] px-4 py-2.5 text-[0.88rem] tracking-[-0.02em] text-[#d7d1d1] transition hover:bg-[#232323] hover:text-white"
                >
                  {reply}
                </button>
              ))}

              {!showIntroState ? (
                <button
                  type="button"
                  onClick={onRefreshSuggestions}
                  disabled={isRefreshingSuggestions}
                  className="rounded-full bg-white/[0.04] px-4 py-2.5 text-[0.82rem] uppercase tracking-[0.18em] text-[#989191] transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                >
                  {isRefreshingSuggestions ? 'Refreshing…' : 'Refresh'}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-[1.7rem] bg-[#101010]/94 px-4 py-3 shadow-[0_22px_60px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.04] backdrop-blur-2xl">
            <div className="flex items-end gap-3">
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#c8c2c2] transition hover:bg-white/[0.05] hover:text-white"
                aria-label="Attachments are not available in Ask Vault"
                title="Ask Vault currently uses saved material already in the vault"
              >
                <AskVaultIcon name="paperclip" className="h-5 w-5" />
              </button>

              <textarea
                ref={textareaRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about your saved material..."
                rows={1}
                aria-label="Ask Vault prompt"
                className="max-h-[220px] min-h-[52px] w-full resize-none border-0 bg-transparent py-3 text-[1.02rem] leading-7 text-[#ece7e7] placeholder:text-[#706a6a] focus:outline-none focus:ring-0"
              />

              <button
                type="button"
                onClick={() => {
                  onSubmitPrompt();
                }}
                disabled={!message.trim() || isLoading}
                aria-label="Send message"
                className={cx(
                  'mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition',
                  message.trim() && !isLoading
                    ? 'bg-gradient-to-b from-[#8f8a8a] to-[#c8c3c3] text-[#151515] shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:from-[#a6a0a0] hover:to-[#d9d4d4]'
                    : 'cursor-not-allowed bg-white/[0.04] text-[#5f5a5a]',
                )}
              >
                {isLoading ? (
                  <LoadingSpinner className="h-5 w-5 border-black/20 border-t-[#151515]" />
                ) : (
                  <AskVaultIcon name="send" className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-3 text-center text-[0.72rem] uppercase tracking-[0.22em] text-[#767070]">
            AI agent may produce inaccurate information. Verify critical data.
          </div>
        </div>
      </div>
    </div>
  );
}
