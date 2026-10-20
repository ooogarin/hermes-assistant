import { classNames } from '../../lib/class-names';
import { Button } from '../ui/button';
import { getAnswerResultStyle } from './grammar-answer-result';
import type { GrammarQuestion } from '../../features/grammar/grammar-api';

type GrammarQuestionNavProps = {
  /** The number of the next question, when there is one. */
  nextQuestionNumber?: number;
  /** The number of the previous question, when there is one. */
  previousQuestionNumber?: number;
  questions: GrammarQuestion[];
  /** The question that is currently open. */
  selectedQuestionNumber: number;
  onSelect: (questionNumber: number) => void;
};

/** The list of the questions of a session, and the way to walk through them. */
export const GrammarQuestionNav = ({
  nextQuestionNumber,
  previousQuestionNumber,
  questions,
  selectedQuestionNumber,
  onSelect,
}: GrammarQuestionNavProps) => {
  const boxClass = (question: GrammarQuestion, selected: boolean) => {
    const meta = getAnswerResultStyle(question.answer);

    return classNames(
      'inline-flex size-10 shrink-0 items-center justify-center rounded-control border text-sm font-semibold transition-colors',
      meta?.box ?? 'border-border bg-surface-subtle text-ink-muted',
      selected ? 'outline-2 outline-offset-2 outline-primary' : 'hover:brightness-95',
    );
  };

  const boxLabel = (question: GrammarQuestion) => {
    const meta = getAnswerResultStyle(question.answer);

    return meta === null
      ? `Soal ${question.questionNumber}, belum dinilai`
      : `Soal ${question.questionNumber}, ${meta.label}`;
  };

  return (
    <nav className='rounded-surface border border-border bg-surface p-6' aria-label='Daftar soal'>
      <h2 className='text-lg font-semibold text-ink'>Daftar soal</h2>
      <div className='mt-4 flex flex-wrap gap-2'>
        {questions.map((question) => (
          <button
            key={question.questionNumber}
            aria-current={question.questionNumber === selectedQuestionNumber ? 'true' : undefined}
            aria-label={boxLabel(question)}
            className={boxClass(question, question.questionNumber === selectedQuestionNumber)}
            onClick={() => onSelect(question.questionNumber)}
            type='button'
          >
            {question.questionNumber}
          </button>
        ))}
      </div>
      <div className='mt-4 flex items-center justify-between gap-2 border-t border-border pt-4'>
        <Button
          disabled={previousQuestionNumber === undefined}
          onClick={() => {
            if (previousQuestionNumber !== undefined) onSelect(previousQuestionNumber);
          }}
          variant='secondary'
        >
          Sebelumnya
        </Button>
        <Button
          disabled={nextQuestionNumber === undefined}
          onClick={() => {
            if (nextQuestionNumber !== undefined) onSelect(nextQuestionNumber);
          }}
          variant='secondary'
        >
          Berikutnya
        </Button>
      </div>
    </nav>
  );
};
