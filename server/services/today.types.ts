export type LearningBrief = {
  topicTagsUsed: string[];
  resources: Array<{
    type: "article" | "book" | "course";
    title: string;
    url: string;
    domain: string;
    whyThisMatches: string[];
    source: "stub" | "web";
  }>;
};

export type TodayView = {
  date: string;
  topTags: Array<{ tag: string; count: number }>;
  learningBrief: LearningBrief;
  keyIdeas?: string[];
  interestingFacts?: Array<{ fact: string; source?: string }>;
  randomFact?: { fact: string; source?: string };
};

export type ResearchStep = {
  name: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  startedAt?: string;
  endedAt?: string;
  error?: string;
};

export type ResearchRun = {
  id: string;
  kind: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  startedAt: string;
  endedAt?: string;
  metadata?: {
    topicId?: string | null;
    runMode?: string | null;
  };
  steps: ResearchStep[];
};

export type ResearchArtifact = {
  id: string;
  runId: string | null;
  day: string;
  agent: string;
  kind: string;
  status: 'proposed' | 'approved' | 'rejected' | 'active';
  title: string;
  preview?: string;
  createdAt: string;
  sourceUrl?: string;
  sourceDocumentId?: string;
  sourceRefs?: Record<string, unknown>;
  content?: Record<string, unknown>;
};

export type ResearchView = {
  date: string;
  runs: ResearchRun[];
  inbox: ResearchArtifact[];
  active: ResearchArtifact[];
};

export type EvidenceReviewRun = Omit<ResearchRun, 'steps'>;

export type EvidenceReviewView = {
  date: string;
  runs: EvidenceReviewRun[];
  inbox: ResearchArtifact[];
  active: ResearchArtifact[];
};

export type AgentControlStep = ResearchStep;
export type AgentControlRun = ResearchRun;
export type AgentControlArtifact = ResearchArtifact;
export type AgentControlCenterView = ResearchView;
