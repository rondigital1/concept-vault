import { checkVaultDuplicateArgsSchema } from '@/server/ai/tools/webScout.toolSchemas';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { filterExistingUrls, filterPreviouslyProposedUrls } from '@/server/repos/webScout.repo';

export async function checkVaultDuplicateTool(
  args: unknown,
  scope?: WorkspaceScope,
): Promise<string> {
  const parsed = checkVaultDuplicateArgsSchema.parse(args);
  if (!scope) {
    throw new Error('Workspace scope is required for duplicate checks');
  }

  const notInVault = await filterExistingUrls(scope, parsed.urls);
  const existingUrls = parsed.urls.filter((url) => !notInVault.includes(url));

  const { newUrls, previouslyProposed } = await filterPreviouslyProposedUrls(scope, notInVault);

  return JSON.stringify({ newUrls, existingUrls, previouslyProposed });
}
