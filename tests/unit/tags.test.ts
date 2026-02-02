/**
 * Unit tests for tag normalization utilities.
 * 
 * Tests the deterministic logic in server/agents/helpers/tags.ts
 * No database or external services required.
 */
import { describe, it, expect } from 'vitest';
import { normalizeTag, finalizeTags } from '@/server/agents/helpers/tags';

describe('normalizeTag', () => {
  describe('valid tags', () => {
    it('should lowercase tags', () => {
      expect(normalizeTag('Spaced Repetition')).toBe('spaced repetition');
      expect(normalizeTag('LEARNING')).toBe('learning');
    });

    it('should trim whitespace', () => {
      expect(normalizeTag('  learning  ')).toBe('learning');
      expect(normalizeTag('\tspaced repetition\n')).toBe('spaced repetition');
    });

    it('should normalize multiple spaces to single space', () => {
      expect(normalizeTag('spaced   repetition')).toBe('spaced repetition');
      expect(normalizeTag('learning    science')).toBe('learning science');
    });

    it('should allow 1-3 word tags', () => {
      expect(normalizeTag('learning')).toBe('learning');
      expect(normalizeTag('spaced repetition')).toBe('spaced repetition');
      expect(normalizeTag('learning science basics')).toBe('learning science basics');
    });
  });

  describe('invalid tags - filtered out', () => {
    it('should filter tags shorter than 3 characters', () => {
      expect(normalizeTag('ai')).toBeNull();
      expect(normalizeTag('a')).toBeNull();
      expect(normalizeTag('ab')).toBeNull();
    });

    it('should filter tags longer than 40 characters', () => {
      const longTag = 'this is a very long tag that exceeds the maximum allowed length';
      expect(normalizeTag(longTag)).toBeNull();
    });

    it('should filter tags with more than 3 words', () => {
      expect(normalizeTag('this has four words')).toBeNull();
      expect(normalizeTag('one two three four five')).toBeNull();
    });

    it('should filter stop tags', () => {
      expect(normalizeTag('introduction')).toBeNull();
      expect(normalizeTag('overview')).toBeNull();
      expect(normalizeTag('guide')).toBeNull();
      expect(normalizeTag('article')).toBeNull();
      expect(normalizeTag('notes')).toBeNull();
      expect(normalizeTag('example')).toBeNull();
      expect(normalizeTag('basics')).toBeNull();
      expect(normalizeTag('concepts')).toBeNull();
      expect(normalizeTag('tutorial')).toBeNull();
      expect(normalizeTag('how to')).toBeNull();
    });

    it('should filter empty strings', () => {
      expect(normalizeTag('')).toBeNull();
      expect(normalizeTag('   ')).toBeNull();
    });
  });

  describe('punctuation handling', () => {
    it('should remove punctuation', () => {
      expect(normalizeTag('spaced-repetition')).toBe('spaced repetition');
      expect(normalizeTag('learning.science')).toBe('learning science');
      expect(normalizeTag('AI/ML')).toBe('ai ml');
    });

    it('should handle special characters', () => {
      expect(normalizeTag('c++')).toBeNull(); // 'c' is too short (< 3 chars)
      expect(normalizeTag('node.js')).toBe('node js');
    });
  });
});

describe('finalizeTags', () => {
  it('should deduplicate tags', () => {
    const input = ['learning', 'Learning', 'LEARNING', 'spaced repetition'];
    const result = finalizeTags(input);

    expect(result).toHaveLength(2);
    expect(result).toContain('learning');
    expect(result).toContain('spaced repetition');
  });

  it('should respect maxFinal limit', () => {
    const input = [
      'learning',
      'memory',
      'science',
      'practice',
      'retention',
      'recall',
      'testing',
      'education',
      'psychology',
      'research',
    ];

    const result = finalizeTags(input, 5);
    expect(result).toHaveLength(5);

    // Should take the first 5 valid tags in order
    expect(result).toEqual(['learning', 'memory', 'science', 'practice', 'retention']);
  });

  it('should use default maxFinal of 8', () => {
    const input = Array.from({ length: 15 }, (_, i) => `tag${i + 100}`); // tag100, tag101, etc.
    const result = finalizeTags(input);

    expect(result).toHaveLength(8);
  });

  it('should filter invalid tags before counting', () => {
    const input = [
      'learning',
      'introduction', // stop tag
      'memory',
      'guide', // stop tag
      'science',
      'a', // too short
      'practice',
    ];

    const result = finalizeTags(input);
    expect(result).toEqual(['learning', 'memory', 'science', 'practice']);
  });

  it('should handle empty input', () => {
    expect(finalizeTags([])).toEqual([]);
  });

  it('should handle all-invalid input', () => {
    const input = ['introduction', 'guide', 'a', 'ab'];
    expect(finalizeTags(input)).toEqual([]);
  });

  it('should preserve order of valid tags', () => {
    const input = ['memory', 'learning', 'science'];
    const result = finalizeTags(input);

    expect(result).toEqual(['memory', 'learning', 'science']);
  });

  it('should handle mixed case duplicates', () => {
    const input = ['Learning', 'MEMORY', 'learning', 'Memory', 'science'];
    const result = finalizeTags(input);

    expect(result).toHaveLength(3);
    expect(result).toEqual(['learning', 'memory', 'science']);
  });
});
