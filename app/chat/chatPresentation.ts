import type { Message } from './types';

export type TimelineLink = {
  id: string;
  label: string;
  meta: string;
};

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function formatOutlineLabel(content: string, index: number): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return `Message ${index}`;
  }

  if (normalized.length <= 52) {
    return normalized;
  }

  return `${normalized.slice(0, 52)}...`;
}

export function getTargetScrollTop(container: HTMLDivElement, target: HTMLDivElement): number {
  let offsetTop = 0;
  let node: HTMLElement | null = target;

  while (node && node !== container) {
    offsetTop += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }

  if (node === container) {
    return offsetTop;
  }

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  return container.scrollTop + targetRect.top - containerRect.top;
}

export function getLastUserPrompt(messages: Message[], messageId: string) {
  const messageIndex = messages.findIndex((msg) => msg.id === messageId);

  for (let index = messageIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return messages[index].content;
    }
  }

  return '';
}

export function formatTimelineMeta(timestamp: Date, index: number): string {
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
    return `Prompt ${String(index + 1).padStart(2, '0')}`;
  }

  return timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
