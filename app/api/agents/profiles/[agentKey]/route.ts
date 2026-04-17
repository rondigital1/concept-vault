import { NextResponse } from 'next/server';
import {
  type AgentKey,
  type AgentProfileSettingsMap,
} from '@/server/agents/configuration';
import {
  agentProfileKeySchema,
  agentProfilePatchRequestSchema,
} from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import { updateAgentProfile } from '@/server/repos/agentProfiles.repo';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ agentKey: string }> },
) {
  try {
    const parsedKey = agentProfileKeySchema.safeParse((await params).agentKey);
    if (!parsedKey.success) {
      return NextResponse.json({ error: 'Unknown agent profile' }, { status: 404 });
    }

    const agentKey = parsedKey.data as AgentKey;
    const body = await parseJsonRequest(request, agentProfilePatchRequestSchema, {
      route: '/api/agents/profiles/[agentKey]',
      allowEmptyObject: true,
    });
    const profile = await updateAgentProfile(
      agentKey,
      body as Partial<AgentProfileSettingsMap[AgentKey]>,
    );
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
    }
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to update agent profile') },
      { status: 400 },
    );
  }
}
