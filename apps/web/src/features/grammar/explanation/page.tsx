import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getGrammarExplanation } from '../grammar-api';

const GrammarExplanationPage = () => {
  const { code = '', number = '' } = useParams();
  const questionNumber = Number(number);
  const explanation = useApiQuery(`${code}:${number}`, (signal) => getGrammarExplanation(code, questionNumber, signal));

  return (
    <div className='mx-auto w-full'>
      <Link
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to={`/english/grammar/${code}`}
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke sesi
      </Link>

      {explanation.status === 'loading' ? (
        <div className='mt-7'>
          <CollectionSkeleton rows={4} />
        </div>
      ) : null}
      {explanation.status === 'error' ? (
        <div className='mt-7'>
          {explanation.error instanceof ApiError && explanation.error.status === 404 ? (
            <ContentState title='Penjelasan tidak ditemukan' description='Soal atau sesi ini mungkin tidak tersedia.' />
          ) : (
            <ErrorState onRetry={explanation.retry} />
          )}
        </div>
      ) : null}
      {explanation.status === 'success' ? (
        <article className='mt-7 rounded-surface border border-border bg-surface p-6 sm:p-9'>
          <p className='text-sm font-semibold text-primary'>Soal {explanation.data.questionNumber}</p>
          <p className='mt-2 text-sm text-ink-muted'>
            {explanation.data.grammarArea} · {explanation.data.grammarPoint}
          </p>
          <h1 className='mt-7 text-2xl font-semibold leading-9 text-ink'>{explanation.data.questionText}</h1>
          <section className='mt-8 border-t border-border pt-7'>
            <h2 className='text-lg font-semibold text-ink'>Penjelasan</h2>
            <p className='mt-3 whitespace-pre-wrap text-base leading-8 text-ink'>{explanation.data.explanation}</p>
          </section>
        </article>
      ) : null}
    </div>
  );
};

export default GrammarExplanationPage;
