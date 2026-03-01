import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

function normalizeEmail(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function emailFromProfile(profile: unknown): string | null {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const raw = (profile as { email?: unknown }).email;
  return typeof raw === 'string' ? normalizeEmail(raw) : null;
}

const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [Google],
  callbacks: {
    async signIn({ user, profile }) {
      const candidateEmail = normalizeEmail(user.email) ?? emailFromProfile(profile);

      if (!ownerEmail) {
        if (process.env.NODE_ENV === 'production') {
          console.error('OWNER_EMAIL is not set. Rejecting sign-in in production.');
          return false;
        }
        return true;
      }

      return candidateEmail === ownerEmail;
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === 'string') {
        session.user.email = token.email;
      }

      return session;
    },
  },
});
