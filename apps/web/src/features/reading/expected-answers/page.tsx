import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState } from '../../../components/feedback/content-state';
import { QueryError } from '../../../components/feedback/query-error';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getReadingExpectedAnswers } from '../reading-api';

const ReadingExpectedAnswersPage = () => {
  const { code = '' } = useParams();
  const answers = useApiQuery(code, (signal) => getReadingExpectedAnswers(code, signal));

  return (
    <div className='space-y-7'>
      <Link
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to={`/english/reading/${code}`}
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke materi
      </Link>
      <PageHeader title='Jawaban acuan' />
      {answers.status === 'loading' ? <CollectionSkeleton rows={4} /> : null}
      {answers.status === 'error' ? (
        <QueryError
          error={answers.error}
          notFound={{
            title: 'Jawaban acuan tidak ditemukan',
            description: 'Materi ini mungkin sudah tidak tersedia.',
          }}
          onRetry={answers.retry}
        />
      ) : null}
      {answers.status === 'success' && answers.data.length === 0 ? (
        <ContentState title='Bacaan ini tanpa pertanyaan' description='Tidak ada jawaban acuan untuk bacaan ini.' />
      ) : null}
      {answers.status === 'success' && answers.data.length > 0 ? (
        <section className='rounded-surface border border-border bg-surface px-6 sm:px-8'>
          <ol>
            {answers.data.map((answer) => (
              <li key={answer.questionNumber} className='border-b border-border py-7 last:border-b-0'>
                <h2 className='font-semibold leading-7 text-ink'>
                  {answer.questionNumber}. {answer.questionText}
                </h2>
                <p className='mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-muted'>{answer.expectedAnswer}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
};

export default ReadingExpectedAnswersPage;
