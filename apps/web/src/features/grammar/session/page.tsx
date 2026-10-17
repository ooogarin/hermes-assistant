import { ArrowLeft, CheckCircle2, CircleMinus, CircleX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { GrammarSessionHeader } from '../../../components/grammar/grammar-session-header';
import { Button } from '../../../components/ui/button';
import { ApiError } from '../../../lib/api/api-error';
import { classNames } from '../../../lib/class-names';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getGrammarSession } from '../grammar-api';
import type { GrammarQuestion, GrammarSession } from '../grammar-api';

const resultStyle = {
  correct: { icon: CheckCircle2, label: 'Benar', style: 'text-primary' },
  partial: { icon: CircleMinus, label: 'Sebagian benar', style: 'text-warning' },
  incorrect: { icon: CircleX, label: 'Belum tepat', style: 'text-danger' },
} as const;

const QuestionResult = ({ question }: { question: GrammarQuestion }) => {
  if (question.answer?.result === null || question.answer === null) return null;
  const result = resultStyle[question.answer.result];
  const Icon = result.icon;
  return (
    <div className={classNames('mt-5 flex gap-2 text-sm font-medium', result.style)}>
      <Icon aria-hidden='true' className='mt-0.5 shrink-0' size={19} />
      <p>
        {result.label}.{question.answer.feedback === null ? null : ` ${question.answer.feedback}`}
      </p>
    </div>
  );
};

const SessionWorkspace = ({ initial }: { initial: GrammarSession }) => {
  const session = initial;
  const firstOpenQuestion = session.questions.find((question) => question.answer === null)?.questionNumber ?? 1;
  const [questionNumber, setQuestionNumber] = useState(firstOpenQuestion);
  const question = session.questions.find((item) => item.questionNumber === questionNumber) ?? session.questions[0];
  const answeredCount = session.questions.filter((item) => item.answer !== null).length;

  const nextQuestion = () => {
    const index = session.questions.findIndex((item) => item.questionNumber === question.questionNumber);
    const next = session.questions[index + 1];
    if (next !== undefined) setQuestionNumber(next.questionNumber);
  };

  return (
    <>
      <GrammarSessionHeader session={session} />
      <div className='mt-8 grid gap-6 xl:grid-cols-[9rem_minmax(0,1fr)_18rem]'>
        <nav className='rounded-surface border border-border bg-surface p-4' aria-label='Daftar soal'>
          <h2 className='text-sm font-semibold text-ink'>Soal</h2>
          <div className='mt-4 grid grid-cols-5 gap-2 xl:grid-cols-1'>
            {session.questions.map((item) => (
              <button
                key={item.questionNumber}
                className={classNames(
                  'flex min-h-11 items-center justify-center gap-2 rounded-control border px-3 text-sm font-semibold transition-colors',
                  item.questionNumber === question.questionNumber
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border bg-surface text-ink hover:bg-surface-subtle',
                )}
                onClick={() => setQuestionNumber(item.questionNumber)}
                type='button'
              >
                {item.questionNumber}
                {item.answer === null ? null : <CheckCircle2 aria-hidden='true' className='text-primary' size={16} />}
              </button>
            ))}
          </div>
        </nav>

        <section className='min-h-[30rem] rounded-surface border border-border bg-surface p-6 sm:p-8'>
          <p className='text-sm font-semibold text-primary'>
            Soal {question.questionNumber} dari {session.questionCount}
          </p>
          <p className='mt-2 text-sm text-ink-muted'>
            {question.questionType} · {question.grammarArea} · {question.grammarPoint}
          </p>
          <h2 className='mt-7 text-xl font-medium leading-8 text-ink'>{question.questionText}</h2>
          <div className='mt-7'>
            <h3 className='text-sm font-semibold text-ink'>Jawaban tersimpan</h3>
            <p className='mt-2 whitespace-pre-wrap rounded-control border border-border bg-surface-subtle px-4 py-3 text-base leading-7 text-ink'>
              {question.answer === null ? 'Belum dijawab.' : question.answer.userAnswer}
            </p>
          </div>
          <QuestionResult question={question} />
          <div className='mt-8 flex flex-wrap items-center justify-between gap-3'>
            <Link
              className='inline-flex min-h-11 items-center justify-center rounded-control border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-subtle'
              to={`/english/grammar/${session.code}/questions/${question.questionNumber}/explanation`}
            >
              Lihat penjelasan
            </Link>
            <Button
              disabled={question.questionNumber === session.questions.at(-1)?.questionNumber}
              onClick={nextQuestion}
              variant='secondary'
            >
              Soal berikutnya
            </Button>
          </div>
        </section>

        <aside className='rounded-surface border border-border bg-surface p-6'>
          <h2 className='text-lg font-semibold text-ink'>Sesi ini</h2>
          <p className='mt-4 text-sm leading-6 text-ink-muted'>
            {answeredCount} dari {session.questionCount} soal terjawab.
          </p>
          <p className='mt-5 text-sm leading-6 text-ink-muted'>
            {session.mode === 'practice'
              ? 'Practice memberikan umpan balik melalui evaluasi Hermes setelah setiap jawaban.'
              : 'Jawaban exam disimpan tanpa hasil dan dinilai bersama setelah sesi selesai.'}
          </p>
          {session.status === 'completed' ? (
            <Link
              className='mt-6 inline-flex text-sm font-semibold text-primary hover:underline'
              to={`/english/grammar/${session.code}/report`}
            >
              Lihat laporan
            </Link>
          ) : null}
        </aside>
      </div>
    </>
  );
};

const GrammarSessionPage = () => {
  const { code = '' } = useParams();
  const session = useApiQuery(code, (signal) => getGrammarSession(code, signal));
  const content = useMemo(() => {
    if (session.status === 'loading') return <CollectionSkeleton rows={5} />;
    if (session.status === 'error') {
      return session.error instanceof ApiError && session.error.status === 404 ? (
        <ContentState title='Sesi Grammar tidak ditemukan' description='Periksa kembali kode sesi yang dibuka.' />
      ) : (
        <ErrorState onRetry={session.retry} />
      );
    }
    return <SessionWorkspace initial={session.data} />;
  }, [session]);

  return (
    <div>
      <Link
        className='mb-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to='/english/grammar'
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Semua Grammar
      </Link>
      {content}
    </div>
  );
};

export default GrammarSessionPage;
