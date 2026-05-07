export type {
  CreateSavedTopicInput,
  LinkedTopicDocumentRow,
  SavedTopicRow,
  TopicCadence,
  TopicDocumentRow,
  UpdateSavedTopicInput,
  UpsertTopicSetupInput,
} from '@/server/repos/savedTopics.types';

export {
  getSavedTopicsByIds,
  listDueTrackedTopics,
  listSavedTopics,
} from '@/server/repos/savedTopics.queries';

export {
  createSavedTopic,
  markTopicRunCompleted,
  markTopicsUpdatedByTags,
  setTopicSignal,
  updateSavedTopic,
  upsertTopicSetup,
} from '@/server/repos/savedTopics.mutations';

export {
  countTopicLinkedDocuments,
  countTopicSignalsSince,
  getTopicDocuments,
  getTopicLinkedDocuments,
  listTopicDocumentLinks,
} from '@/server/repos/savedTopics.documents';

export {
  linkDocumentToMatchingTopics,
  linkTopicToMatchingDocuments,
} from '@/server/repos/savedTopics.linking';
