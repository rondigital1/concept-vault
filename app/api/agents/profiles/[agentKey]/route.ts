import { NextResponse } from 'next/server';
import {
  AGENT_KEYS,
  type AgentKey,
  type AgentProfileSettingsMap,
} from '@/server/agents/configuration';
import { updateAgentProfile } from '@/server/repos/agentProfiles.repo';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

function isAgentKey(value: string): value is AgentKey {
  return (AGENT_KEYS as readonly string[]).includes(value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ agentKey: string }> },
) {
  try {
    const { agentKey } = await params;

    if (!isAgentKey(agentKey)) {
      return NextResponse.json({ error: 'Unknown agent profile' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const profile = await updateAgentProfile(
      agentKey,
      body as Partial<AgentProfileSettingsMap[AgentKey]>,
    );
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to update agent profile') },
      { status: 400 },
    );
  }
}
