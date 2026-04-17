import type { DrawerKey, WorkbenchTopic } from './types';

export type QueueFilter = 'pending' | 'saved';

export function getTopicForSelection(
  topics: WorkbenchTopic[],
  preferredTopicId: string | null,
): string | null {
  if (preferredTopicId && topics.some((topic) => topic.id === preferredTopicId)) {
    return preferredTopicId;
  }

  return topics[0]?.id ?? null;
}

export function readQueueFilter(
  value: string | null,
  fallback: QueueFilter,
): QueueFilter {
  return value === 'saved' || value === 'pending' ? value : fallback;
}

export function readDrawerKey(
  value: string | null,
  fallback: DrawerKey | null,
): DrawerKey | null {
  return value === 'topic' || value === 'report' || value === 'evidence' ? value : fallback;
}

export function buildNextHref(
  pathname: string,
  searchParams: { toString(): string },
  updates: {
    topicId?: string | null;
    artifactId?: string | null;
    queue?: QueueFilter | null;
    drawer?: DrawerKey | null;
  },
) {
  const nextParams = new URLSearchParams(searchParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      continue;
    }

    if (value === null || value === '') {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
  }

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
