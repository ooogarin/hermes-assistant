import { classNames } from '../../lib/class-names';
import { formatDisplayLabel } from '../../lib/formatting/formatters';
import { getAnswerResultStyle } from './grammar-answer-result';
import { GrammarExplanationDrawer, GrammarExplanationToggle } from './grammar-explanation-drawer';
import type { GrammarQuestion } from '../../features/grammar/grammar-api';

type GrammarQuestionPanelProps = {
  /** The explanation that was already loaded for this question. */
  cachedExplanation?: string;
  /** The session the question belongs to. */
  code: string;
  /** Whether the explanation is open. */
  explanationExpanded: boolean;
  onExplanationLoaded: (questionNumber: number, text: string) => void;
  onToggleExplanation: () => void;
  question: GrammarQuestion;
  questionCount: number;
};

/** The question, the answer that was saved for it, and the result of grading. */
export const GrammarQuestionPanel = ({
  cachedExplanation,
  code,
  explanationExpanded,
  onExplanationLoaded,
  onToggleExplanation,
  question,
  questionCount,
}: GrammarQuestionPanelProps) => {
  const resultMeta = getAnswerResultStyle(question.answer);
  const ResultIcon = resultMeta?.icon;

  return (
    <section className='min-w-0 rounded-surface border border-border bg-surface p-6 sm:p-8'>
      <p className='text-sm font-semibold text-primary'>
        Soal {question.questionNumber} dari {questionCount}
      </p>
      <p className='mt-1 text-sm text-ink-muted'>
        {formatDisplayLabel(question.questionType)} · {formatDisplayLabel(question.grammarArea)} ·{' '}
        {formatDisplayLabel(question.grammarPoint)}
      </p>

      <h2 className='mt-7 text-xl font-medium leading-8 text-ink'>{question.questionText}</h2>

      <div className='mt-7'>
        <h3 className='text-sm font-semibold text-ink'>Jawaban tersimpan</h3>
        <p className='mt-2 whitespace-pre-wrap border-l-4 border-border bg-surface-subtle px-4 py-3 text-base leading-7 text-ink'>
          {question.answer === null ? 'Belum dijawab.' : question.answer.userAnswer}
        </p>
      </div>

      {resultMeta === null ? null : (
        <div
          className={classNames(
            'mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border px-4 py-3',
            resultMeta.banner,
          )}
        >
          <span className='inline-flex items-center gap-2 text-sm font-semibold'>
            {ResultIcon === undefined ? null : <ResultIcon aria-hidden='true' size={18} />}
            {resultMeta.label}
          </span>
          {question.answer?.feedback ? <span className='text-sm'>{question.answer.feedback}</span> : null}
          <GrammarExplanationToggle expanded={explanationExpanded} onToggle={onToggleExplanation} />
        </div>
      )}

      {resultMeta !== null && explanationExpanded ? (
        <GrammarExplanationDrawer
          cached={cachedExplanation}
          code={code}
          onLoaded={onExplanationLoaded}
          question={question}
        />
      ) : null}
    </section>
  );
};
