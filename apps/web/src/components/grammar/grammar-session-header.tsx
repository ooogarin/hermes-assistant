import { formatDisplayLabel } from '../../lib/formatting/formatters';
import type { GrammarSession } from '../../features/grammar/grammar-api';

const modeLabel = { exam: 'Exam', practice: 'Practice' } as const;

export const GrammarSessionHeader = ({ session }: { session: GrammarSession }) => {
  const points = [...new Set(session.questions.map((question) => question.grammarPoint))];
  const focus = points.length === 1 ? formatDisplayLabel(points[0]) : 'Mixed grammar';

  return (
    <header>
      <h1 className='break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl'>
        {modeLabel[session.mode]} · {focus}
      </h1>
    </header>
  );
};
