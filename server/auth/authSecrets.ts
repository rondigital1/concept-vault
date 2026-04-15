const DEV_AUTH_FALLBACK_SECRET = 'concept-vault-dev-insecure-auth-secret';

function normalizeSecret(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getSecretFromAliases(
  env: NodeJS.ProcessEnv,
  authKey: string,
  nextAuthKey: string,
): string | null {
  const authSecret = normalizeSecret(env[authKey]);
  const nextAuthSecret = normalizeSecret(env[nextAuthKey]);

  if (authSecret && nextAuthSecret && authSecret !== nextAuthSecret) {
    throw new Error(
      `${authKey} and ${nextAuthKey} are both set but do not match. Keep them identical or remove the NEXTAUTH_* alias.`,
    );
  }

  return authSecret ?? nextAuthSecret;
}

function getRotationIndexes(env: NodeJS.ProcessEnv): number[] {
  const indexes = new Set<number>();

  for (const key of Object.keys(env)) {
    const match = /^(?:AUTH|NEXTAUTH)_SECRET_(\d+)$/.exec(key);
    if (!match) {
      continue;
    }

    const index = Number.parseInt(match[1] ?? '', 10);
    if (Number.isInteger(index) && index > 0) {
      indexes.add(index);
    }
  }

  return [...indexes].sort((left, right) => left - right);
}

export function resolveAuthSecrets(env: NodeJS.ProcessEnv = process.env): string | string[] {
  const primarySecret = getSecretFromAliases(env, 'AUTH_SECRET', 'NEXTAUTH_SECRET');
  const rotationIndexes = getRotationIndexes(env);

  if (!primarySecret && rotationIndexes.length > 0) {
    throw new Error(
      'AUTH_SECRET is required when using rotated auth secrets. Set AUTH_SECRET to the current secret and keep older values in AUTH_SECRET_1, AUTH_SECRET_2, etc.',
    );
  }

  const secrets: string[] = [];

  if (primarySecret) {
    secrets.push(primarySecret);
  }

  for (const index of rotationIndexes) {
    const rotatedSecret = getSecretFromAliases(
      env,
      `AUTH_SECRET_${index}`,
      `NEXTAUTH_SECRET_${index}`,
    );

    if (!rotatedSecret || secrets.includes(rotatedSecret)) {
      continue;
    }

    secrets.push(rotatedSecret);
  }

  if (secrets.length > 0) {
    return secrets.length === 1 ? secrets[0] : secrets;
  }

  if (env.NODE_ENV !== 'production') {
    console.warn(
      '[auth] AUTH_SECRET is missing. Falling back to an insecure development secret. Set AUTH_SECRET in .env to remove this warning.',
    );
    return DEV_AUTH_FALLBACK_SECRET;
  }

  throw new Error(
    'AUTH_SECRET is required in production. Set AUTH_SECRET (or NEXTAUTH_SECRET) before starting the server.',
  );
}

export { DEV_AUTH_FALLBACK_SECRET, normalizeSecret };
