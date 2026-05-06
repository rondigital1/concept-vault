'use client';

import type { TimelineLink } from '../chatPresentation';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { PromptTimeline } from './PromptTimeline';

export function ChatDesktopRails({
  sessionId,
  timelineLinks,
  highlightedMessageId,
  onNewChat,
  onJumpToMessage,
}: {
  sessionId: string | null;
  timelineLinks: TimelineLink[];
  highlightedMessageId: string | null;
  onNewChat: () => void;
  onJumpToMessage: (messageId: string) => void;
}) {
  return (
    <>
      <div className="fixed bottom-0 left-0 top-16 z-30 hidden w-[18.75rem] lg:block">
        <ChatHistorySidebar
          isOpen
          variant="desktop"
          onToggle={() => undefined}
          currentSessionId={sessionId}
          onNewChat={onNewChat}
        />
      </div>

      <div className="fixed bottom-0 right-0 top-16 z-30 hidden w-[20rem] xl:block">
        <aside className="flex h-full flex-col bg-[#1a1a1a]/92 px-8 pb-8 pt-12 backdrop-blur-2xl shadow-[-18px_0_48px_rgba(0,0,0,0.24)]">
          <div className="pb-8">
            <p className="text-[0.9rem] font-semibold uppercase tracking-[0.28em] text-[#d0cbcb]">
              Prompt Timeline
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            <PromptTimeline
              links={timelineLinks}
              highlightedMessageId={highlightedMessageId}
              onJump={onJumpToMessage}
            />
          </div>
        </aside>
      </div>
    </>
  );
}
