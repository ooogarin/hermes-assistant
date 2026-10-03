import type { WritingAnalysis } from '../../src/modules/writing/writing-submission/writing-submission.types';

export const writingAnalysis: WritingAnalysis = {
  summary: {
    overall_feedback: 'The draft is clear and relevant.',
    strengths: ['Clear main idea'],
    priority_improvements: ['Use more varied vocabulary'],
  },
  grammar: {
    error_count: 1,
    items: [
      {
        original: 'I go yesterday.',
        corrected: 'I went yesterday.',
        error_type: 'past_tense',
        explanation: 'Use the simple past for a completed action.',
      },
    ],
  },
  corrected_text: 'I went to the office yesterday.',
  vocabulary: {
    repeated_words: [],
    better_phrases: [],
    new_useful_words: [
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
  prompt_adherence: {
    status: 'aligned',
    notes: 'The response follows the assigned topic and genre.',
  },
  next_steps: ['Review the simple past tense.'],
};
