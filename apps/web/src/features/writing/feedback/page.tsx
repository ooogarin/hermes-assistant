import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { WritingFeedback } from '../../../components/writing/writing-feedback';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getWritingSubmission } from '../writing-api';

const WritingFeedbackPage = () => {
  const { code = '', submissionNumber = '' } = useParams();
  const number = Number(submissionNumber);
  const submission = useApiQuery(`${code}:${number}`, (signal) => getWritingSubmission(code, number, signal));

  return (
    <div>
      <Link
        className='mb-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to={`/english/writing/${code}`}
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke prompt
      </Link>
      {submission.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {submission.status === 'error' ? (
        submission.error instanceof ApiError && submission.error.status === 404 ? (
          <ContentState title='Feedback tidak ditemukan' description='Periksa kembali nomor draft dari Hermes.' />
        ) : (
          <ErrorState onRetry={submission.retry} />
        )
      ) : null}
      {submission.status === 'success' ? <WritingFeedback code={code} submission={submission.data} /> : null}
    </div>
  );
};

export default WritingFeedbackPage;
