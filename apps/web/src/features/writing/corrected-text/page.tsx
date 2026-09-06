import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getCorrectedWriting } from '../writing-api';

const CorrectedWritingPage = () => {
  const { code = '', submissionNumber = '' } = useParams();
  const number = Number(submissionNumber);
  const result = useApiQuery(`${code}:${number}`, (signal) => getCorrectedWriting(code, number, signal));
  const feedbackPath = `/english/writing/${code}/submissions/${number}`;

  return (
    <div>
      <Link
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to={feedbackPath}
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke feedback
      </Link>
      <header className='mt-8 border-b border-border pb-8'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Versi perbaikan</h1>
        <p className='mt-2 text-base text-ink-muted'>
          {code} · Draft #{number}
        </p>
      </header>
      <div className='mt-8'>
        {result.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
        {result.status === 'error' ? (
          result.error instanceof ApiError && result.error.status === 404 ? (
            <ContentState title='Versi perbaikan tidak ditemukan' description='Periksa kembali kode dan nomor draft.' />
          ) : (
            <ErrorState onRetry={result.retry} />
          )
        ) : null}
        {result.status === 'success' ? (
          <article className='rounded-surface border border-border bg-surface px-6 py-8 sm:px-8'>
            <p className='max-w-(--reading-width) whitespace-pre-wrap text-base leading-8 text-ink'>
              {result.data.correctedText}
            </p>
          </article>
        ) : null}
      </div>
    </div>
  );
};

export default CorrectedWritingPage;
