const BOILERPLATE_LINE_PATTERNS: RegExp[] = [
  /^(home|about|contact|menu|search)$/i,
  /^(log in|login|sign in|sign up|subscribe)$/i,
  /^(privacy policy|terms|cookie policy|cookie settings)$/i,
  /^(read more|related articles?|share|print)$/i,
  /^skip to (main )?content$/i,
  /^https?:\/\/\S+$/i,
];

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function stripHtml(html: string): string {
  let cleaned = html;
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  cleaned = cleaned.replace(/<template[\s\S]*?<\/template>/gi, ' ');
  cleaned = cleaned.replace(/<\/(p|div|section|article|li|ul|ol|h[1-6]|tr)>/gi, '\n');
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  cleaned = decodeHtmlEntities(cleaned);
  return cleaned;
}

export function normalizeExtractedText(value: string): string {
  return filterBoilerplateLines(normalizeWhitespace(value));
}

function filterBoilerplateLines(value: string): string {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) {
        return false;
      }
      if (BOILERPLATE_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
        return false;
      }
      if (/^(?:\w+\s*\|\s*){2,}\w+$/i.test(line)) {
        return false;
      }
      if (/^(?:[a-z][a-z0-9-]{1,20}\s+){4,}[a-z][a-z0-9-]{1,20}$/i.test(line)) {
        return false;
      }

      const urlMatches = line.match(/https?:\/\/\S+/gi) ?? [];
      if (urlMatches.length >= 2 && line.length < 240) {
        return false;
      }

      return true;
    });

  return lines.join('\n').trim();
}
