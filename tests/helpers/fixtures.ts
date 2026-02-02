/**
 * Test fixtures - stable test data for deterministic tests.
 */

/**
 * Sample document content for testing.
 */
export const SAMPLE_DOCUMENTS = {
  spacedRepetition: {
    title: 'Spaced Repetition: The Science of Long-Term Memory',
    source: 'https://example.com/spaced-repetition-guide',
    content: `
Spaced repetition is a learning technique that involves reviewing material at increasing intervals.
This method leverages the spacing effect, a phenomenon where information is better retained when 
learning sessions are spaced out over time rather than crammed into a single session.

Key principles of spaced repetition:
1. Review information just before you're about to forget it
2. Gradually increase the interval between reviews
3. Focus more time on difficult material

The SM-2 algorithm, developed by Piotr Wozniak, is one of the most well-known implementations 
of spaced repetition. It calculates optimal review intervals based on your performance.

Research shows that spaced repetition can improve long-term retention by up to 200% compared 
to massed practice (cramming). This makes it particularly effective for:
- Language learning and vocabulary acquisition
- Medical education and terminology
- Any subject requiring memorization of facts
`.trim(),
    tags: ['spaced repetition', 'learning', 'memory'],
  },

  retrievalPractice: {
    title: 'The Testing Effect: Why Retrieval Practice Works',
    source: 'https://learning-science.edu/testing-effect',
    content: `
Retrieval practice, also known as the testing effect, is the finding that actively recalling 
information from memory strengthens long-term retention more effectively than passive review.

When you attempt to retrieve information from memory, you're not just assessing what you know—
you're actually changing the memory itself, making it more accessible in the future.

Key research findings:
- Students who take practice tests remember more than those who just re-read material
- Even unsuccessful retrieval attempts can improve learning
- Feedback after retrieval attempts enhances the benefit

Practical applications:
1. Use flashcards to test yourself rather than just reading notes
2. Practice explaining concepts without looking at your materials
3. Take practice quizzes before exams
4. Write summaries from memory before checking your notes
`.trim(),
    tags: ['retrieval practice', 'testing effect', 'learning science'],
  },

  distributedSystems: {
    title: 'Introduction to Distributed Systems',
    source: 'https://tech.example.com/distributed-systems',
    content: `
Distributed systems are computing environments where components located on networked computers 
communicate and coordinate their actions by passing messages. The components interact with 
each other to achieve a common goal.

Key challenges in distributed systems:
1. Partial failure - components can fail independently
2. Network partitions - communication can be interrupted
3. Consistency vs availability tradeoffs (CAP theorem)
4. Ordering of events - determining causality across nodes

Common patterns:
- Leader election for coordination
- Consensus algorithms (Paxos, Raft)
- Eventual consistency models
- Distributed transactions (2PC, Saga)
`.trim(),
    tags: ['distributed systems', 'software engineering'],
  },
};

/**
 * Fixed day string for artifact testing.
 */
export const TEST_DAY = '2025-01-15';

/**
 * Sample WebScout proposals for testing.
 */
export const SAMPLE_WEBSCOUT_PROPOSALS = [
  {
    url: 'https://example.com/spaced-repetition',
    title: 'Introduction to Spaced Repetition',
    summary: 'Spaced repetition is a learning technique that involves reviewing material at increasing intervals.',
    relevanceReason: 'Directly addresses spaced repetition with actionable information.',
    relevanceScore: 0.92,
    contentType: 'article' as const,
    topics: ['spaced repetition', 'learning'],
    sourceQuery: 'spaced repetition techniques',
    excerpt: 'Spaced repetition is a learning technique...',
  },
  {
    url: 'https://learning-science.edu/retrieval-practice',
    title: 'Understanding Retrieval Practice',
    summary: 'Retrieval practice is the act of recalling information from memory.',
    relevanceReason: 'Covers retrieval practice with research backing.',
    relevanceScore: 0.88,
    contentType: 'documentation' as const,
    topics: ['retrieval practice', 'learning science'],
    sourceQuery: 'retrieval practice research',
    excerpt: 'Retrieval practice is the act of recalling...',
  },
  {
    url: 'https://psychology.org/memory-learning',
    title: 'Memory and Learning Science',
    summary: 'The science of memory and learning has advanced significantly.',
    relevanceReason: 'Comprehensive overview of memory and learning science.',
    relevanceScore: 0.85,
    contentType: 'article' as const,
    topics: ['memory', 'learning', 'science'],
    sourceQuery: 'memory improvement science',
    excerpt: 'The science of memory and learning...',
  },
];

/**
 * Sample concepts for Distiller testing.
 */
export const SAMPLE_CONCEPTS = [
  {
    label: 'Spaced Repetition',
    type: 'principle' as const,
    summary: 'A learning technique that involves reviewing material at increasing intervals to improve long-term retention.',
    evidence: [
      { quote: 'Spaced repetition is a learning technique that involves reviewing material at increasing intervals.' },
    ],
  },
  {
    label: 'Testing Effect',
    type: 'principle' as const,
    summary: 'The finding that actively recalling information improves memory more than passive review.',
    evidence: [
      { quote: 'Studies show retrieval practice dramatically improves learning compared to passive review.' },
    ],
  },
];

/**
 * Sample flashcards for Distiller testing.
 */
export const SAMPLE_FLASHCARDS = [
  {
    format: 'qa' as const,
    front: 'What is spaced repetition?',
    back: 'A learning technique that involves reviewing material at increasing intervals to improve long-term retention.',
    conceptLabel: 'Spaced Repetition',
  },
  {
    format: 'cloze' as const,
    front: 'The {{testing effect}} refers to the finding that actively recalling information improves memory.',
    back: 'The testing effect refers to the finding that actively recalling information improves memory.',
    conceptLabel: 'Testing Effect',
  },
];
