import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { JunkDetailPane } from '../../../components/junk/junk-detail-pane';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getJunkItem } from '../junk-api';

const JunkDetailPage = () => {
  const { code = '' } = useParams();
  const detail = useApiQuery(code, (signal) => getJunkItem(code, signal));

  return (
    <div className='space-y-4'>
      <Link className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline' to='/junk'>
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke Junk
      </Link>

      {detail.status === 'loading' ? <CollectionSkeleton rows={4} /> : null}
      {detail.status === 'error' ? (
        detail.error instanceof ApiError && detail.error.status === 404 ? (
          <ContentState
            title='Junk tidak ditemukan'
            description='Item ini mungkin sudah tidak tersedia.'
            action={
              <Link className='font-semibold text-primary hover:underline' to='/junk'>
                Kembali ke Junk
              </Link>
            }
          />
        ) : (
          <ErrorState onRetry={detail.retry} />
        )
      ) : null}
      {detail.status === 'success' ? <JunkDetailPane item={detail.data} mode='page' /> : null}
    </div>
  );
};

export default JunkDetailPage;
