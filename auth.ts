import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { resolveAuthSecrets } from '@/server/auth/authSecrets';
import {
  applyIdentityToToken,
  applyTokenToSession,
  canSignInWithEmail,
  hasIdentityClaims,
  normalizeEmail,
  resolveSessionIdentity,
} from '@/server/auth/sessionIdentity';

function emailFromProfile(profile: unknown): string | null {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const raw = (profile as { email?: unknown }).email;
  return typeof raw === 'string' ? normalizeEmail(raw) : null;
}

const authSecret = resolveAuthSecrets();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret,
  session: { strategy: 'jwt' },
  providers: [Google],
  callbacks: {
    async signIn({ user, profile }) {
      const candidateEmail = normalizeEmail(user.email) ?? emailFromProfile(profile);
      return canSignInWithEmail(candidateEmail);
    },
    async jwt({ token, user, profile }) {
      const email =
        normalizeEmail(user?.email) ??
        normalizeEmail(typeof token.email === 'string' ? token.email : null) ??
        emailFromProfile(profile);

      if (!email) {
        return token;
      }

      token.email = email;

      if (hasIdentityClaims(token) && !user) {
        return token;
      }

      const identity = await resolveSessionIdentity({
        email,
        name:
          typeof user?.name === 'string'
            ? user.name
            : typeof token.name === 'string'
              ? token.name
              : null,
        image:
          typeof user?.image === 'string'
            ? user.image
            : typeof token.picture === 'string'
              ? token.picture
              : null,
      });

      return applyIdentityToToken(token, identity);
    },
    async session({ session, token }) {
      return applyTokenToSession(session, token);
    },
  },
});
