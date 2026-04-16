import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id?: string;
      membershipRole?: 'owner' | 'member';
    };
    workspace?: {
      id: string;
      name: string;
      slug: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    workspaceId?: string;
    workspaceName?: string;
    workspaceSlug?: string;
    membershipRole?: 'owner' | 'member';
  }
}
