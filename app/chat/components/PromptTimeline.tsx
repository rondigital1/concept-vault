'use client';

import { cx, type TimelineLink } from '../chatPresentation';

export function PromptTimeline({
  links,
  highlightedMessageId,
  onJump,
}: {
  links: TimelineLink[];
  highlightedMessageId: string | null;
  onJump: (messageId: string) => void;
}) {
  if (links.length === 0) {
    return (
      <p className="rounded-[1.35rem] bg-[#161616] px-4 py-4 text-sm leading-6 text-[#8f8888]">
        Ask your first question to build the prompt timeline for this session.
      </p>
    );
  }

  return (
    <nav className="relative pl-6">
      <div className="absolute bottom-0 left-[0.3rem] top-1 w-px bg-white/[0.08]" />
      <div className="space-y-8">
        {links.map((link) => {
          const active = highlightedMessageId === link.id;

          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onJump(link.id)}
              className="group relative block w-full text-left"
            >
              <span
                className={cx(
                  'absolute -left-6 top-1.5 h-3 w-3 rounded-full transition',
                  active
                    ? 'bg-[#d7d2d2] shadow-[0_0_12px_rgba(255,255,255,0.28)]'
                    : 'bg-white/[0.14] group-hover:bg-white/[0.3]',
                )}
              />
              <span
                className={cx(
                  'block text-[1.08rem] leading-7 tracking-[-0.035em] transition',
                  active ? 'text-white' : 'text-[#d5d0d0] group-hover:text-white',
                )}
              >
                {link.label}
              </span>
              <span className="mt-2 block text-[0.73rem] uppercase tracking-[0.2em] text-[#878181]">
                {link.meta}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
