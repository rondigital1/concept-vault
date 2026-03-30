export const GOAL_STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'that',
  'this',
  'from',
  'into',
  'about',
  'for',
  'what',
  'when',
  'where',
  'which',
  'should',
  'could',
  'would',
  'your',
  'their',
  'our',
  'learn',
  'learning',
  'focus',
  'find',
  'build',
  'how',
  'can',
  'does',
  'are',
  'was',
  'were',
  'has',
  'have',
  'been',
  'being',
  'will',
  'not',
  'but',
  'also',
  'more',
  'most',
  'some',
  'than',
  'very',
  'just',
]);

/**
 * Extract meaningful search terms from a goal string,
 * filtering out stop words and short tokens.
 */
export function extractSearchTerms(goal: string): string[] {
  return goal
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !GOAL_STOP_WORDS.has(word));
}
