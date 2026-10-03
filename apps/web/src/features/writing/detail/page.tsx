import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { WritingSubmissionDetail } from '../../../components/writing/writing-submission-detail';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getWritingSubmission } from '../writing-api';

const WritingDetailPage = () => {
  const { code = '' } = useParams();
  const submission = useApiQuery(code, (signal) => getWritingSubmission(code, signal));

  return (
    <div className='space-y-7'>
      <NavigationNotice />
      <Link
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to='/english/writing'
      >
        <ArrowLeft aria-hidden='true' size={18} /> Semua tulisan
      </Link>
      {submission.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {submission.status === 'error' ? (
        submission.error instanceof ApiError && submission.error.status === 404 ? (
          <ContentState title='Tulisan tidak ditemukan' description='Tulisan ini mungkin sudah tidak tersedia.' />
        ) : (
          <ErrorState onRetry={submission.retry} />
        )
      ) : null}
      {submission.status === 'success' ? <WritingSubmissionDetail submission={submission.data} /> : null}
    </div>
  );
};

export default WritingDetailPage;
