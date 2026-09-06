import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { NoteDetailPane } from '../../../components/notes/note-detail-pane';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getNote } from '../notes-api';

const NotesDetailPage = () => {
  const { code = '' } = useParams();
  const detail = useApiQuery(code, (signal) => getNote(code, signal));

  return (
    <div className='space-y-4'>
      <Link className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline' to='/notes'>
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke Notes
      </Link>

      {detail.status === 'loading' ? <CollectionSkeleton rows={4} /> : null}
      {detail.status === 'error' ? (
        detail.error instanceof ApiError && detail.error.status === 404 ? (
          <ContentState
            title='Catatan tidak ditemukan'
            description='Catatan ini mungkin sudah tidak tersedia.'
            action={
              <Link className='font-semibold text-primary hover:underline' to='/notes'>
                Kembali ke Notes
              </Link>
            }
          />
        ) : (
          <ErrorState onRetry={detail.retry} />
        )
      ) : null}
      {detail.status === 'success' ? <NoteDetailPane mode='page' note={detail.data} /> : null}
    </div>
  );
};

export default NotesDetailPage;
