import type { SelectedTopicSummary } from './types';

export const REPORT_THRESHOLD = 3;

export function formatTopicTags(selectedTopic: SelectedTopicSummary | null): string {
  if (!selectedTopic || selectedTopic.focusTags.length === 0) {
    return 'TOPIC WORKSPACE';
  }

  return selectedTopic.focusTags.slice(0, 3).join(' · ').toUpperCase();
}
