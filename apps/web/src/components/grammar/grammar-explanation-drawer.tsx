import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect } from 'react';
import { getGrammarExplanation } from '../../features/grammar/grammar-api';
import { useApiQuery } from '../../lib/hooks/use-api-query';
import type { GrammarQuestion } from '../../features/grammar/grammar-api';

const drawerBodyClassName = 'mt-3 rounded-control border border-border bg-surface-subtle px-4 py-4';

const ExplanationBody = ({ text }: { text: string }) => (
  <div className={drawerBodyClassName} id='grammar-explanation'>
    <h3 className='text-sm font-semibold text-ink'>Penjelasan</h3>
    <p className='mt-2 whitespace-pre-wrap text-sm leading-7 text-ink'>{text}</p>
  </div>
);

const ExplanationLoader = ({
  code,
  onLoaded,
  questionNumber,
}: {
  code: string;
  onLoaded: (questionNumber: number, text: string) => void;
  questionNumber: number;
}) => {
  const explanation = useApiQuery(`grammar-explanation:${code}:${questionNumber}`, (signal) =>
    getGrammarExplanation(code, questionNumber, signal),
  );
  const loadedText = explanation.status === 'success' ? explanation.data.explanation : null;

  useEffect(() => {
    if (loadedText !== null) {
      onLoaded(questionNumber, loadedText);
    }
  }, [loadedText, onLoaded, questionNumber]);

  if (explanation.status === 'loading') {
    return (
      <div className={drawerBodyClassName} id='grammar-explanation'>
        <p className='text-sm text-ink-muted' role='status'>
          Memuat penjelasan…
        </p>
      </div>
    );
  }

  if (explanation.status === 'error') {
    return (
      <div className={drawerBodyClassName} id='grammar-explanation'>
        <p className='text-sm text-ink-muted'>Penjelasan belum dapat dimuat.</p>
        <button
          className='mt-2 text-sm font-semibold text-primary underline-offset-2 hover:underline'
          onClick={explanation.retry}
          type='button'
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return <ExplanationBody text={explanation.data.explanation} />;
};

export const GrammarExplanationDrawer = ({
  cached,
  code,
  onLoaded,
  question,
}: {
  cached: string | undefined;
  code: string;
  onLoaded: (questionNumber: number, text: string) => void;
  question: GrammarQuestion;
}) => {
  const known = question.explanation ?? cached;

  if (known !== undefined && known !== null) {
    return <ExplanationBody text={known} />;
  }

  return <ExplanationLoader code={code} onLoaded={onLoaded} questionNumber={question.questionNumber} />;
};

export const GrammarExplanationToggle = ({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) => (
  <button
    aria-controls={expanded ? 'grammar-explanation' : undefined}
    aria-expanded={expanded}
    className='ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-2 hover:underline'
    onClick={onToggle}
    type='button'
  >
    {expanded ? 'Sembunyikan penjelasan' : 'Lihat penjelasan'}
    {expanded ? <ChevronUp aria-hidden='true' size={16} /> : <ChevronDown aria-hidden='true' size={16} />}
  </button>
);
