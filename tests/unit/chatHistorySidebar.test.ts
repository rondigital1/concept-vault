import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const { useSWRMock } = vi.hoisted(() => ({
  useSWRMock: vi.fn(),
}));

vi.mock('swr', () => ({
  default: useSWRMock,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/app/actions/chatHistoryActions', () => ({
  listSessionsAction: vi.fn(),
  deleteSessionAction: vi.fn(),
}));

vi.mock('@/app/components/OverlaySurface', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('@/app/components/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { ChatHistorySidebar } from '@/app/chat/components/ChatHistorySidebar';

describe('ChatHistorySidebar', () => {
  beforeEach(() => {
    useSWRMock.mockReset();
  });

  it('renders session rows as links and marks the current conversation', () => {
    useSWRMock.mockReturnValue({
      data: [
        {
          id: 'session-1',
          title: 'Report follow-up',
          preview: 'Summarize the newest findings',
          messageCount: 4,
          updatedAt: '2026-04-17T10:00:00.000Z',
        },
        {
          id: 'session-2',
          title: 'Concept cleanup',
          preview: 'Which notes need cleanup?',
          messageCount: 3,
          updatedAt: '2026-04-16T10:00:00.000Z',
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(ChatHistorySidebar, {
        isOpen: true,
        onToggle: () => {},
        currentSessionId: 'session-2',
        onNewChat: () => {},
      }),
    );

    expect(html).toContain('href="/chat?session=session-1"');
    expect(html).toContain('href="/chat?session=session-2"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Delete conversation Concept cleanup');
    expect(html).toContain('3 messages');
  });

  it('renders a product-facing empty state when there are no saved conversations', () => {
    useSWRMock.mockReturnValue({
      data: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(ChatHistorySidebar, {
        isOpen: true,
        onToggle: () => {},
        currentSessionId: null,
        onNewChat: () => {},
      }),
    );

    expect(html).toContain('No saved conversations yet.');
  });
});
