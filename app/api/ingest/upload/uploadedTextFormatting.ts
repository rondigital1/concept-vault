export function formatExtractedUploadText(rawText: string): string {
  if (!rawText) {
    return '';
  }

  const lines = rawText.split('\n');
  const result: string[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = (): void => {
    if (currentParagraph.length > 0) {
      result.push(currentParagraph.join(' ').trim());
      currentParagraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (isPreservedMarkdownElement(trimmed)) {
      flushParagraph();
      result.push(trimmed);
      continue;
    }

    if (isLikelyExtractedHeading(trimmed)) {
      flushParagraph();
      result.push(`\n## ${toTitleCase(trimmed)}\n`);
      continue;
    }

    if (isExtractedListItem(trimmed)) {
      flushParagraph();
      result.push(trimmed);
      continue;
    }

    currentParagraph.push(trimmed);

    if (shouldEndParagraph(trimmed, lines[i + 1])) {
      flushParagraph();
    }
  }

  flushParagraph();

  return result
    .filter((paragraph) => paragraph.trim())
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .replace(/\s*-\s*\n\s*/g, '')
    .trim();
}

function isLikelyExtractedHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.length < 100 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return true;
  }

  if (/^(chapter|section|\d+\.|\d+\)|\([a-z]\)|\([0-9]+\))/i.test(trimmed)) {
    return true;
  }

  return false;
}

function isPreservedMarkdownElement(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === '---' || /^\*\*Page \d+\*\*$/.test(trimmed) || /^#{1,6}\s/.test(trimmed);
}

function isExtractedListItem(line: string): boolean {
  const trimmed = line.trim();
  return /^[-•*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
}

function shouldEndParagraph(line: string, nextLine: string | undefined): boolean {
  const trimmed = line.trim();
  if (!endsWithSentencePunctuation(trimmed) || trimmed.length <= 40) {
    return false;
  }

  const nextLineTrimmed = nextLine?.trim() || '';
  return (
    !nextLineTrimmed ||
    /^[A-Z]/.test(nextLineTrimmed) ||
    isLikelyExtractedHeading(nextLineTrimmed)
  );
}

function endsWithSentencePunctuation(line: string): boolean {
  const trimmed = line.trim();
  return /[.!?:;]$/.test(trimmed) || /[.!?]["']$/.test(trimmed);
}

function toTitleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}
