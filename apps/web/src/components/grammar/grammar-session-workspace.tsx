import { useCallback, useRef, useState } from 'react';
import { GrammarQuestionNav } from './grammar-question-nav';
import { GrammarQuestionPanel } from './grammar-question-panel';
import { GrammarSessionHeader } from './grammar-session-header';
import { GrammarSessionInfo } from './grammar-session-info';
import { GrammarSessionTabs } from './grammar-session-tabs';
import type { GrammarSession } from '../../features/grammar/grammar-api';

type GrammarSessionWorkspaceProps = {
  session: GrammarSession;
};

/**
 * The workspace of a session: the open question, the questions beside it, and
 * the details of the session.
 */
export const GrammarSessionWorkspace = ({ session }: GrammarSessionWorkspaceProps) => {
  const [questionNumber, setQuestionNumber] = useState(session.questions[0]?.questionNumber ?? 1);
  const [expandedQuestionNumber, setExpandedQuestionNumber] = useState<number | null>(null);
  const explanationCache = useRef<Record<number, string>>({});
  const question = session.questions.find((item) => item.questionNumber === questionNumber) ?? session.questions[0];
  const questionIndex = session.questions.findIndex((item) => item.questionNumber === question.questionNumber);
  const previousQuestion = session.questions[questionIndex - 1];
  const nextQuestion = session.questions[questionIndex + 1];
  const answeredCount = session.questions.filter((item) => item.answer !== null).length;
  const showScore = session.status === 'completed' && session.score !== null && session.maxScore !== null;
  const isExplanationExpanded = expandedQuestionNumber === question.questionNumber;

  // Keep fetched explanations across drawer openings without re-rendering the open drawer.
  const cacheExplanation = useCallback((loadedQuestionNumber: number, text: string) => {
    explanationCache.current[loadedQuestionNumber] = text;
  }, []);

  return (
    <>
      <GrammarSessionHeader session={session} />
      <GrammarSessionTabs code={session.code} reportAvailable={session.status === 'completed'} />
      <div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]'>
        <GrammarQuestionPanel
          cachedExplanation={explanationCache.current[question.questionNumber]}
          code={session.code}
          explanationExpanded={isExplanationExpanded}
          onExplanationLoaded={cacheExplanation}
          onToggleExplanation={() => setExpandedQuestionNumber(isExplanationExpanded ? null : question.questionNumber)}
          question={question}
          questionCount={session.questionCount}
        />

        <div className='space-y-6'>
          <GrammarQuestionNav
            nextQuestionNumber={nextQuestion?.questionNumber}
            previousQuestionNumber={previousQuestion?.questionNumber}
            questions={session.questions}
            selectedQuestionNumber={question.questionNumber}
            onSelect={setQuestionNumber}
          />

          <GrammarSessionInfo answeredCount={answeredCount} session={session} showScore={showScore} />
        </div>
      </div>
    </>
  );
};
