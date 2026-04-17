import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getAgentsView } from '@/server/services/agents.service';
import { AgentsWorkspaceClient } from './AgentsWorkspaceClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageSearchParams = Record<string, string | string[] | undefined>;

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
  const scope = await requireSessionWorkspace();
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const selectedTopicId = firstQueryParam(resolvedSearchParams.topicId);
  const selectedRunId = firstQueryParam(resolvedSearchParams.runId);
  const initialView = await getAgentsView(scope, { selectedTopicId, selectedRunId });

  return <AgentsWorkspaceClient initialView={initialView} />;
}
