import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { todayISODate } from '@/server/services/todayDate';
import { generateTodayContent, getSourceDocsForToday } from '@/server/services/todayContent.service';
import {
  buildLearningBrief,
  buildStubLearningBrief,
  buildWebLearningBrief,
} from '@/server/services/todayLearningBrief.service';
import {
  getEvidenceReviewView,
  getResearchView,
} from '@/server/services/todayResearchView.service';
import { getTopTags } from '@/server/services/todayTags.service';
import type {
  AgentControlArtifact,
  AgentControlCenterView,
  AgentControlRun,
  AgentControlStep,
  EvidenceReviewRun,
  EvidenceReviewView,
  LearningBrief,
  ResearchArtifact,
  ResearchRun,
  ResearchStep,
  ResearchView,
  TodayView,
} from '@/server/services/today.types';

export type {
  AgentControlArtifact,
  AgentControlCenterView,
  AgentControlRun,
  AgentControlStep,
  EvidenceReviewRun,
  EvidenceReviewView,
  LearningBrief,
  ResearchArtifact,
  ResearchRun,
  ResearchStep,
  ResearchView,
  TodayView,
};

export {
  buildLearningBrief,
  buildStubLearningBrief,
  buildWebLearningBrief,
  getEvidenceReviewView,
  getResearchView,
  getTopTags,
};

export const getAgentControlCenterView = getResearchView;

export async function getTodayView(scope: WorkspaceScope): Promise<TodayView> {
  const date = todayISODate();
  const topTags = await getTopTags(scope, 10);
  const learningBrief = await buildLearningBrief(scope);
  const sourceDocs = await getSourceDocsForToday(scope, topTags);
  const additionalContent = await generateTodayContent(sourceDocs);

  return {
    date,
    topTags,
    learningBrief,
    keyIdeas: additionalContent.keyIdeas.length > 0 ? additionalContent.keyIdeas : undefined,
    interestingFacts: additionalContent.interestingFacts.length > 0 ? additionalContent.interestingFacts : undefined,
    randomFact: additionalContent.randomFact || undefined,
  };
}
