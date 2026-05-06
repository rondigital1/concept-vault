'use client';

import { Drawer } from '@/app/components/OverlaySurface';
import type { TimelineLink } from '../chatPresentation';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { PromptTimeline } from './PromptTimeline';

export function ChatDrawers({
  historyDrawerOpen,
  outlineDrawerOpen,
  sessionId,
  timelineLinks,
  highlightedMessageId,
  onCloseHistory,
  onCloseOutline,
  onNewChat,
  onJumpFromDrawer,
}: {
  historyDrawerOpen: boolean;
  outlineDrawerOpen: boolean;
  sessionId: string | null;
  timelineLinks: TimelineLink[];
  highlightedMessageId: string | null;
  onCloseHistory: () => void;
  onCloseOutline: () => void;
  onNewChat: () => void;
  onJumpFromDrawer: (messageId: string) => void;
}) {
  return (
    <>
      <Drawer
        open={historyDrawerOpen}
        onClose={onCloseHistory}
        title="Ask Vault navigation"
        description="Recent sessions and quick access to related workspaces."
        panelClassName="max-w-[22rem] border-0 bg-transparent shadow-none"
        contentClassName="p-0"
      >
        <div className="h-full">
          <ChatHistorySidebar
            isOpen={historyDrawerOpen}
            variant="drawer"
            onToggle={onCloseHistory}
            currentSessionId={sessionId}
            onNewChat={onNewChat}
          />
        </div>
      </Drawer>

      <Drawer
        open={outlineDrawerOpen}
        onClose={onCloseOutline}
        title="Prompt timeline"
        description="Jump through the questions in this session."
        panelClassName="max-w-[22rem] bg-[#1a1a1a]"
        contentClassName="pt-2"
      >
        <PromptTimeline
          links={timelineLinks}
          highlightedMessageId={highlightedMessageId}
          onJump={onJumpFromDrawer}
        />
      </Drawer>
    </>
  );
}
