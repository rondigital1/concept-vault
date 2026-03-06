import { WebScoutProposal } from '@/server/agents/helpers/webScout.types';

export interface AnalyzedEvidence {
  url: string;
  normalizedUrl: string;
  title: string;
  summary: string;
  relevanceScore: number;
  contentType: string;
  topics: string[];
  reasoning: string[];
  clusterId: string;
  domain: string;
}

export interface FindingsCluster {
  id: string;
  label: string;
  topics: string[];
  count: number;
  averageRelevance: number;
  domains: string[];
}

export interface AnalyzeFindingsOutput {
  evidence: AnalyzedEvidence[];
  clusters: FindingsCluster[];
  summary: {
    totalInput: number;
    uniqueEvidence: number;
    clusters: number;
    topDomains: string[];
    averageRelevance: number;
  };
}

function normalizeTopic(topic: string): string {
  return topic.toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizeTopics(topics: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const topic of topics) {
    const clean = normalizeTopic(topic);
    if (!clean || clean.length < 2 || clean.length > 40 || seen.has(clean)) {
      continue;
    }
    seen.add(clean);
    normalized.push(clean);
  }
  return normalized.slice(0, 10);
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';

    // Strip common tracking params to improve dedupe.
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
    for (const key of trackingParams) {
      parsed.searchParams.delete(key);
    }

    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/';
    parsed.pathname = normalizedPath;

    const query = parsed.searchParams.toString();
    return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ''}`;
  } catch {
    return url.trim();
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function chooseClusterLabel(topics: string[], contentType: string, domain: string): string {
  if (topics.length > 0) {
    return topics[0];
  }
  if (contentType && contentType !== 'other') {
    return contentType;
  }
  return domain;
}

export function analyzeFindings(proposals: WebScoutProposal[]): AnalyzeFindingsOutput {
  if (proposals.length === 0) {
    return {
      evidence: [],
      clusters: [],
      summary: {
        totalInput: 0,
        uniqueEvidence: 0,
        clusters: 0,
        topDomains: [],
        averageRelevance: 0,
      },
    };
  }

  const deduped = new Map<string, WebScoutProposal>();
  for (const proposal of proposals) {
    const key = normalizeUrl(proposal.url);
    const existing = deduped.get(key);
    if (!existing || proposal.relevanceScore > existing.relevanceScore) {
      deduped.set(key, proposal);
    }
  }

  const evidence: AnalyzedEvidence[] = Array.from(deduped.entries())
    .map(([normalizedUrl, proposal]) => {
      const domain = extractDomain(proposal.url);
      const topics = normalizeTopics(proposal.topics ?? []);
      const clusterId = chooseClusterLabel(topics, proposal.contentType, domain);

      return {
        url: proposal.url,
        normalizedUrl,
        title: proposal.title,
        summary: proposal.summary,
        relevanceScore: proposal.relevanceScore,
        contentType: proposal.contentType,
        topics,
        reasoning: proposal.reasoning,
        clusterId,
        domain,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 30);

  const clusterMap = new Map<string, AnalyzedEvidence[]>();
  for (const item of evidence) {
    const list = clusterMap.get(item.clusterId) ?? [];
    list.push(item);
    clusterMap.set(item.clusterId, list);
  }

  const clusters: FindingsCluster[] = Array.from(clusterMap.entries())
    .map(([id, items]) => {
      const topicCounts = new Map<string, number>();
      const domainSet = new Set<string>();
      let relevanceSum = 0;

      for (const item of items) {
        relevanceSum += item.relevanceScore;
        domainSet.add(item.domain);
        for (const topic of item.topics) {
          topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
        }
      }

      const sortedTopics = Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([topic]) => topic)
        .slice(0, 5);

      return {
        id,
        label: id,
        topics: sortedTopics,
        count: items.length,
        averageRelevance: items.length > 0 ? relevanceSum / items.length : 0,
        domains: Array.from(domainSet).slice(0, 5),
      };
    })
    .sort((a, b) => b.averageRelevance - a.averageRelevance);

  const domainCounts = new Map<string, number>();
  let relevanceTotal = 0;
  for (const item of evidence) {
    domainCounts.set(item.domain, (domainCounts.get(item.domain) ?? 0) + 1);
    relevanceTotal += item.relevanceScore;
  }

  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([domain]) => domain)
    .slice(0, 8);

  return {
    evidence,
    clusters,
    summary: {
      totalInput: proposals.length,
      uniqueEvidence: evidence.length,
      clusters: clusters.length,
      topDomains,
      averageRelevance: evidence.length > 0 ? relevanceTotal / evidence.length : 0,
    },
  };
}
