import { ArrowLeft, CheckCircle2, CircleMinus, CircleX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { GrammarSessionHeader } from '../../../components/grammar/grammar-session-header';
import { GrammarSessionTabs } from '../../../components/grammar/grammar-session-tabs';
import { Button } from '../../../components/ui/button';
import { CopyButton } from '../../../components/ui/copy-button';
import { ApiError } from '../../../lib/api/api-error';
import { classNames } from '../../../lib/class-names';
import { formatDate, formatDisplayLabel } from '../../../lib/formatting/formatters';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getGrammarSession } from '../grammar-api';
import { grammarSessionStatusLabels, grammarSourceLabels } from '../grammar-display';
import type { ReactNode } from 'react';
import type { GrammarSession } from '../grammar-api';

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

const SessionMetaRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3'>
    <dt className='text-ink-muted'>{label}</dt>
    <dd>{children}</dd>
  </div>
);

const SessionWorkspace = ({ initial }: { initial: GrammarSession }) => {
  const session = initial;
  const [questionNumber, setQuestionNumber] = useState(session.questions[0]?.questionNumber ?? 1);
  const question = session.questions.find((item) => item.questionNumber === questionNumber) ?? session.questions[0];
  const questionIndex = session.questions.findIndex((item) => item.questionNumber === question.questionNumber);
  const previousQuestion = session.questions[questionIndex - 1];
  const nextQuestion = session.questions[questionIndex + 1];
  const answeredCount = session.questions.filter((item) => item.answer !== null).length;
  const result = question.answer?.result ?? null;
  const resultMeta = result === null ? null : resultStyle[result];
  const ResultIcon = resultMeta?.icon;
  const showScore = session.status === 'completed' && session.score !== null && session.maxScore !== null;

  const boxClass = (item: (typeof session.questions)[number], selected: boolean) => {
    const meta = item.answer === null || item.answer.result === null ? null : resultStyle[item.answer.result];
    return classNames(
      'inline-flex size-10 shrink-0 items-center justify-center rounded-control border text-sm font-semibold transition-colors',
      meta?.box ?? 'border-border bg-surface-subtle text-ink-muted',
      selected ? 'outline-2 outline-offset-2 outline-primary' : 'hover:brightness-95',
    );
  };

  const boxLabel = (item: (typeof session.questions)[number]) => {
    const meta = item.answer === null || item.answer.result === null ? null : resultStyle[item.answer.result];
    return meta === null ? `Soal ${item.questionNumber}, belum dinilai` : `Soal ${item.questionNumber}, ${meta.label}`;
  };

  return (
    <>
      <GrammarSessionHeader session={session} />
      <GrammarSessionTabs code={session.code} reportAvailable={session.status === 'completed'} />
      <div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]'>
        <section className='min-w-0 rounded-surface border border-border bg-surface p-6 sm:p-8'>
          <p className='text-sm font-semibold text-primary'>
            Soal {question.questionNumber} dari {session.questionCount}
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
              <Link
                className='ml-auto text-sm font-semibold underline-offset-2 hover:underline'
                to={`/english/grammar/${session.code}/questions/${question.questionNumber}/explanation`}
              >
                Lihat penjelasan
              </Link>
            </div>
          )}
        </section>

        <div className='space-y-6'>
          <nav className='rounded-surface border border-border bg-surface p-6' aria-label='Daftar soal'>
            <h2 className='text-lg font-semibold text-ink'>Daftar soal</h2>
            <div className='mt-4 flex flex-wrap gap-2'>
              {session.questions.map((item) => (
                <button
                  key={item.questionNumber}
                  aria-current={item.questionNumber === question.questionNumber ? 'true' : undefined}
                  aria-label={boxLabel(item)}
                  className={boxClass(item, item.questionNumber === question.questionNumber)}
                  onClick={() => setQuestionNumber(item.questionNumber)}
                  type='button'
                >
                  {item.questionNumber}
                </button>
              ))}
            </div>
            <div className='mt-4 flex items-center justify-between gap-2 border-t border-border pt-4'>
              <Button
                disabled={previousQuestion === undefined}
                onClick={() => {
                  if (previousQuestion !== undefined) setQuestionNumber(previousQuestion.questionNumber);
                }}
                variant='secondary'
              >
                Sebelumnya
              </Button>
              <Button
                disabled={nextQuestion === undefined}
                onClick={() => {
                  if (nextQuestion !== undefined) setQuestionNumber(nextQuestion.questionNumber);
                }}
                variant='secondary'
              >
                Berikutnya
              </Button>
            </div>
          </nav>

          <aside className='rounded-surface border border-border bg-surface p-6'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <h2 className='text-lg font-semibold text-ink'>Sesi ini</h2>
              <span className='rounded-full border border-primary/30 bg-primary-subtle px-3 py-1 text-sm font-medium text-primary'>
                {grammarSessionStatusLabels[session.status]}
              </span>
            </div>
            <section className='mt-6 border-t border-border pt-6' aria-label='Informasi Sesi'>
              <dl className='space-y-2 text-sm'>
                <SessionMetaRow label='Kode'>
                  <span className='flex min-w-0 flex-wrap items-center gap-2'>
                    <span className='break-all text-sm text-ink-muted'>{session.code}</span>
                    <CopyButton value={session.code} label='Salin kode sesi' />
                  </span>
                </SessionMetaRow>
                <SessionMetaRow label='Level'>{session.level}</SessionMetaRow>
                <SessionMetaRow label='Jumlah soal'>{session.questionCount} soal</SessionMetaRow>
                <SessionMetaRow label='Terjawab'>
                  {answeredCount} dari {session.questionCount}
                </SessionMetaRow>
                <SessionMetaRow label='Tanggal'>{formatDate(session.startedAt)}</SessionMetaRow>
                <SessionMetaRow label='Sumber'>{grammarSourceLabels[session.source]}</SessionMetaRow>
                {showScore ? (
                  <SessionMetaRow label='Skor'>
                    <span className='font-semibold text-primary'>
                      {session.score} / {session.maxScore}
                    </span>
                  </SessionMetaRow>
                ) : null}
              </dl>
            </section>
            <p className='mt-6 border-t border-border pt-6 text-sm leading-6 text-ink-muted'>
              {session.mode === 'practice'
                ? 'Practice memberikan umpan balik melalui evaluasi Hermes setelah setiap jawaban.'
                : 'Jawaban exam disimpan tanpa hasil dan dinilai bersama setelah sesi selesai.'}
            </p>
          </aside>
        </div>
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
