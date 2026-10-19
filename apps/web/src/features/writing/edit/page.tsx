import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { QueryError } from '../../../components/feedback/query-error';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { WritingSubmissionForm } from '../../../components/writing/writing-submission-form';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { confirmDiscardChanges } from '../../../lib/hooks/use-unsaved-changes';
import { getWritingSubmission } from '../writing-api';

const WritingEditPage = () => {
  const { code = '' } = useParams();
  const submission = useApiQuery(code, (signal) => getWritingSubmission(code, signal));

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <Link
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        onClick={(event) => {
          if (!confirmDiscardChanges()) {
            event.preventDefault();
          }
        }}
        to={`/english/writing/submissions/${code}`}
      >
        <ArrowLeft aria-hidden='true' size={18} /> Kembali ke tulisan
      </Link>
      <header className='mt-7 border-b border-border pb-7'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Edit tulisan</h1>
        <p className='mt-3 text-sm text-ink-muted'>{code}</p>
      </header>
      {submission.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {submission.status === 'error' ? (
        <QueryError
          error={submission.error}
          notFound={{
            title: 'Tulisan tidak ditemukan',
            description: 'Tulisan ini mungkin sudah tidak tersedia.',
          }}
          onRetry={submission.retry}
        />
      ) : null}
      {submission.status === 'success' ? <WritingSubmissionForm key={code} submission={submission.data} /> : null}
    </div>
  );
};

export default WritingEditPage;
