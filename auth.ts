import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

function normalizeSecret(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveAuthSecret(): string {
  const envSecret =
    normalizeSecret(process.env.AUTH_SECRET) ?? normalizeSecret(process.env.NEXTAUTH_SECRET);

  if (envSecret) {
    return envSecret;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[auth] AUTH_SECRET is missing. Falling back to an insecure development secret. Set AUTH_SECRET in .env to remove this warning.',
    );
    return 'concept-vault-dev-insecure-auth-secret';
  }

  throw new Error(
    'AUTH_SECRET is required in production. Set AUTH_SECRET (or NEXTAUTH_SECRET) before starting the server.',
  );
}

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
const authSecret = resolveAuthSecret();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret,
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
