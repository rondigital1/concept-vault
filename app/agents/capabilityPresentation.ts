import type { AgentKey } from '@/server/agents/configuration';
import type { AgentRegistryEntry, RecentRunSummary } from '@/lib/agentsWorkspaceTypes';

type CapabilityState = 'live' | 'ready' | 'attention';

export type AgentCapabilityCard = {
  id: string;
  title: string;
  contract: string;
  routeHref: string;
  routeLabel: string;
  status: CapabilityState;
  statusLabel: string;
  metricLabel: string;
  metricValue: string;
  detail: string;
};

const AGENT_CAPABILITY_COPY: Record<AgentKey, Pick<AgentCapabilityCard, 'contract' | 'routeHref' | 'routeLabel' | 'detail'>> = {
  pipeline: {
    contract: 'Canonical inline workflow across Curator, WebScout, Distiller, and report synthesis.',
    routeHref: '#agents-controls',
    routeLabel: 'Launch pipeline',
    detail: 'Runs through POST /api/runs/pipeline with explicit topic and threshold overrides.',
  },
  curator: {
    contract: 'Normalizes tags, optionally categorizes documents, and writes document metadata only.',
    routeHref: '#agents-controls',
    routeLabel: 'Configure curation',
    detail: 'Curator proposals flow through the pipeline and keep artifact creation out of the graph.',
  },
  webScout: {
    contract: 'Searches, evaluates, dedupes, and proposes web sources without importing URLs automatically.',
    routeHref: '/web-scout?runMode=scout_only&scope=all_topics',
    routeLabel: 'Find sources',
    detail: 'WebScout emits web-proposal artifacts; ingestion requires explicit approval.',
  },
  distiller: {
    contract: 'Extracts concepts and flashcards as proposed artifacts linked back to source documents.',
    routeHref: '#agents-controls',
    routeLabel: 'Tune distiller',
    detail: 'Distiller respects document limits and keeps generated learning assets in review.',
  },
};

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function resolveCapabilityStatus(entry: AgentRegistryEntry): Pick<AgentCapabilityCard, 'status' | 'statusLabel'> {
  if (entry.state === 'live') {
    return { status: 'live', statusLabel: 'Running' };
  }

  if (entry.state === 'error') {
    return { status: 'attention', statusLabel: 'Needs review' };
  }

  return { status: 'ready', statusLabel: 'Ready' };
}

export function buildAgentCapabilityCards(
  agentRegistry: AgentRegistryEntry[],
  recentRuns: RecentRunSummary[],
  topicCount: number,
): AgentCapabilityCard[] {
  const registryCards = agentRegistry.map((entry) => {
    const copy = AGENT_CAPABILITY_COPY[entry.key];
    const primaryMetric = entry.outputMetrics[0];

    return {
      id: entry.key,
      title: entry.name,
      contract: copy.contract,
      routeHref: copy.routeHref,
      routeLabel: copy.routeLabel,
      detail: copy.detail,
      metricLabel: primaryMetric?.label ?? 'Runs',
      metricValue: primaryMetric?.value ?? '0',
      ...resolveCapabilityStatus(entry),
    };
  });

  return [
    {
      id: 'ingest',
      title: 'Ingestion',
      contract: 'Explicit URL, file, and text intake for new vault material.',
      routeHref: '/ingest',
      routeLabel: 'Add content',
      status: 'ready',
      statusLabel: 'Manual intake',
      metricLabel: 'Tracked topics',
      metricValue: formatCount(topicCount),
      detail: 'New external sources enter through explicit ingest or approval flows, not autonomous crawling.',
    },
    ...registryCards,
    {
      id: 'review',
      title: 'Artifact Review',
      contract: 'Human approval gate for proposed concepts, flashcards, and web proposals.',
      routeHref: '/today',
      routeLabel: 'Open review queue',
      status: recentRuns.some((run) => run.status === 'error' || run.status === 'partial')
        ? 'attention'
        : 'ready',
      statusLabel: 'Approval required',
      metricLabel: 'Recent runs',
      metricValue: formatCount(recentRuns.length),
      detail: 'Research surfaces proposed artifacts for approval; individual artifact pages preserve approve and reject actions.',
    },
    {
      id: 'observability',
      title: 'Run Observability',
      contract: 'Every run exposes trace steps for debugging agent, tool, LLM, and flow failures.',
      routeHref: '#agents-runs',
      routeLabel: 'Inspect runs',
      status: recentRuns.some((run) => run.status === 'running') ? 'live' : 'ready',
      statusLabel: recentRuns.some((run) => run.status === 'running') ? 'Live trace' : 'Trace ready',
      metricLabel: 'Runs loaded',
      metricValue: formatCount(recentRuns.length),
      detail: 'The dashboard reads run traces and result summaries instead of inventing synthetic telemetry.',
    },
  ];
}
