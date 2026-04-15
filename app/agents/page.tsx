import { Inter } from 'next/font/google';
import { getAgentsView } from '@/server/services/agents.service';
import { AgentsWorkspaceClient } from './AgentsWorkspaceClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageSearchParams = Record<string, string | string[] | undefined>;

const agentsSans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
});

function firstQueryParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return null;
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const selectedTopicId = firstQueryParam(resolvedSearchParams.topicId);
  const selectedRunId = firstQueryParam(resolvedSearchParams.runId);
  const initialView = await getAgentsView({ selectedTopicId, selectedRunId });

  return (
    <AgentsWorkspaceClient
      initialView={initialView}
      fontClassName={agentsSans.className}
    />
  );
}
