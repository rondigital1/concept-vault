const STRUCTURAL_LINE_PATTERNS = [
  /^#{1,6}\s/,
  /^```/,
  /^~~~+/,
  /^\s*[-*_]{3,}\s*$/,
  /^\s*[-*+]\s/,
  /^\s*\d+[.)]\s/,
  /^\s*>\s?/,
  /^\|.*\|$/,
  /^<[^>]+>$/,
  /^\s{4,}\S/,
];

const SENTENCE_END_REGEX = /[.!?]["')\]]?$/;
const PARAGRAPH_START_REGEX = /^[A-Z0-9"'(\[]/;

function isStructuralLine(line: string): boolean {
  return STRUCTURAL_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function normalizeInlineSpacing(text: string): string {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function shouldBreakParagraph(currentLine: string, nextLine: string | undefined): boolean {
  if (!nextLine) return true;

  const current = currentLine.trim();
  const next = nextLine.trim();

  if (!next) return true;
  if (isStructuralLine(next)) return true;
  if (current.length < 40) return false;

  return SENTENCE_END_REGEX.test(current) && PARAGRAPH_START_REGEX.test(next);
}

function flushParagraph(output: string[], paragraphLines: string[]): void {
  if (paragraphLines.length === 0) return;

  output.push(paragraphLines.map(normalizeInlineSpacing).join(' '));
  paragraphLines.length = 0;
}

export function formatDocumentMarkdown(content: string): string {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return '';

  const lines = normalized.split('\n');
  const output: string[] = [];
  const paragraphLines: string[] = [];
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (/^(```|~~~+)/.test(trimmed)) {
      flushParagraph(output, paragraphLines);
      output.push(line);
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph(output, paragraphLines);
      if (output.at(-1) !== '') {
        output.push('');
      }
      continue;
    }

    if (isStructuralLine(trimmed)) {
      flushParagraph(output, paragraphLines);
      output.push(line);
      continue;
    }

    paragraphLines.push(trimmed);

    if (shouldBreakParagraph(trimmed, lines[index + 1])) {
      flushParagraph(output, paragraphLines);
      if (lines[index + 1]?.trim()) {
        output.push('');
      }
    }
  }

  flushParagraph(output, paragraphLines);

  return output
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
