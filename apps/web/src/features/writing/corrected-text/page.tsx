import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getCorrectedWriting } from '../writing-api';

const CorrectedWritingPage = () => {
  const { code = '' } = useParams();
  const result = useApiQuery(code, (signal) => getCorrectedWriting(code, signal));
  const feedbackPath = `/english/writing/submissions/${code}/feedback`;

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
      </header>
      <div className='mt-8'>
        {result.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
        {result.status === 'error' ? (
          result.error instanceof ApiError && result.error.status === 404 ? (
            <ContentState title='Tulisan tidak ditemukan' description='Periksa kembali kode tulisan.' />
          ) : result.error instanceof ApiError && result.error.code === 'WRITING_SUBMISSION_NOT_ANALYZED' ? (
            <ContentState
              title='Tulisan belum dianalisis'
              description='Versi perbaikan tersedia setelah analisis melalui Telegram.'
            />
          ) : (
            <ErrorState onRetry={result.retry} />
          )
        ) : null}
        {result.status === 'success' ? (
          <article className='rounded-surface border border-border bg-surface px-6 py-8 sm:px-8'>
            <p className='whitespace-pre-wrap break-words text-base leading-8 text-ink'>{result.data.correctedText}</p>
          </article>
        ) : null}
      </div>
    </div>
  );
};

export default CorrectedWritingPage;
