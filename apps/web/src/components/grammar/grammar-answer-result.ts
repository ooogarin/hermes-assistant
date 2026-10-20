import { CheckCircle2, CircleMinus, CircleX } from 'lucide-react';
import type { GrammarQuestion } from '../../features/grammar/grammar-api';

const resultStyle = {
  correct: {
    banner: 'border-primary/25 bg-primary-subtle text-primary',
    box: 'border-primary/30 bg-primary-subtle text-primary',
    icon: CheckCircle2,
    label: 'Benar',
  },
  partial: {
    banner: 'border-warning/30 bg-warning/10 text-warning',
    box: 'border-warning/30 bg-warning/10 text-warning',
    icon: CircleMinus,
    label: 'Sebagian benar',
  },
  incorrect: {
    banner: 'border-danger/25 bg-danger-subtle text-danger',
    box: 'border-danger/30 bg-danger-subtle text-danger',
    icon: CircleX,
    label: 'Belum tepat',
  },
} as const;

/** The style of a graded answer, or null while the answer is not graded yet. */
export const getAnswerResultStyle = (answer: GrammarQuestion['answer']) => {
  if (answer === null || answer.result === null) {
    return null;
  }

  return resultStyle[answer.result];
};
