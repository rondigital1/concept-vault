import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const FETCH_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 10_000;
const FETCH_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const FETCH_MAX_REDIRECTS = 5;

export function isHttpUrl(value: string | undefined | null): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return true;
  }

  const [firstOctet, secondOctet] = octets;

  if (firstOctet === 10) {
    return true;
  }
  if (firstOctet === 127) {
    return true;
  }
  if (firstOctet === 169 && secondOctet === 254) {
    return true;
  }
  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return true;
  }
  if (firstOctet === 192 && secondOctet === 168) {
    return true;
  }
  if (firstOctet === 0) {
    return true;
  }
  if (firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127) {
    return true;
  }

  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === '::1') {
    return true;
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }
  if (normalized.startsWith('fe80')) {
    return true;
  }
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.replace('::ffff:', '');
    return isPrivateIpv4(mapped);
  }

  return false;
}

function isPrivateIpAddress(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    return isPrivateIpv4(address);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(address);
  }

  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === 'host.docker.internal' ||
    normalized.endsWith('.local')
  );
}

export async function assertPublicUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Refusing to fetch non-http(s) URLs');
  }

  const hostname = parsed.hostname;
  if (isBlockedHostname(hostname)) {
    throw new Error('Refusing to fetch local or private network addresses');
  }

  if (isPrivateIpAddress(hostname)) {
    throw new Error('Refusing to fetch private IP addresses');
  }

  try {
    const addresses = await lookup(hostname, { all: true });
    if (addresses.some((entry) => isPrivateIpAddress(entry.address))) {
      throw new Error('Refusing to fetch hostnames resolving to private IP addresses');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Refusing to fetch')) {
      throw error;
    }

    throw new Error('Could not resolve URL host');
  }
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function createTimeoutSignal(timeoutMs: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
}

export async function fetchValidatedResponse(url: string): Promise<Response> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= FETCH_MAX_REDIRECTS; redirectCount += 1) {
    await assertPublicUrl(currentUrl);

    const { signal, cancel } = createTimeoutSignal(FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': FETCH_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        },
        redirect: 'manual',
        signal,
      });

      if (!isRedirectStatus(response.status)) {
        return response;
      }

      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect response missing location header');
      }

      currentUrl = new URL(location, currentUrl).toString();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('URL fetch timed out');
      }

      throw error;
    } finally {
      cancel();
    }
  }

  throw new Error('Too many redirects while fetching URL');
}

export async function readResponseTextWithLimit(response: Response): Promise<string> {
  const lengthHeader = response.headers.get('content-length');
  if (lengthHeader) {
    const contentLength = Number(lengthHeader);
    if (Number.isFinite(contentLength) && contentLength > FETCH_MAX_RESPONSE_BYTES) {
      throw new Error('Fetched URL content is too large');
    }
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > FETCH_MAX_RESPONSE_BYTES) {
    throw new Error('Fetched URL content is too large');
  }

  return buffer.toString('utf-8');
}
