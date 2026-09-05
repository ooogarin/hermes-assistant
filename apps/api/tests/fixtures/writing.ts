import type { WritingAnalysis } from '../../src/modules/writing/writing.types';

export const writingAnalysis: WritingAnalysis = {
  summary: {
    overallFeedback: 'The draft is clear and relevant.',
    strengths: ['Clear main idea'],
    priorityImprovements: ['Use more varied vocabulary'],
  },
  grammar: {
    errorCount: 1,
    items: [
      {
        original: 'I go yesterday.',
        corrected: 'I went yesterday.',
        errorType: 'past_tense',
        explanation: 'Use the simple past for a completed action.',
      },
    ],
  },
  correctedText: 'I went to the office yesterday.',
  vocabulary: {
    repeatedWords: [],
    betterPhrases: [],
    newUsefulWords: [
      {
        word: 'productive',
        meaning: 'Producing useful results.',
        example: 'I had a productive day.',
      },
    ],
  },
  structure: {
    feedback: 'The draft has a clear sequence.',
    suggestions: ['Add a concluding sentence.'],
  },
  topicAdherence: {
    status: 'aligned',
    notes: 'The response addresses the assigned topic.',
  },
  genreAdherence: {
    status: 'aligned',
    notes: 'The tone matches a journal entry.',
  },
  nextSteps: ['Review the simple past tense.'],
};
