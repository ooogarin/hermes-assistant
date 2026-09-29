import { ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { NoteActions } from '../../../components/notes/note-actions';
import { NoteDetailPane } from '../../../components/notes/note-detail-pane';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getNote } from '../notes-api';

const NotesDetailPage = () => {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    typeof location.state?.returnTo === 'string' && /^\/notes(?:\?|$)/.test(location.state.returnTo)
      ? location.state.returnTo
      : '/notes';
  const detail = useApiQuery(code, (signal) => getNote(code, signal));
  const onDeleted = () => {
    const destination = new URL(returnTo, window.location.origin);
    destination.searchParams.delete('preview');
    navigate(`${destination.pathname}${destination.search}`, {
      replace: true,
      state: { notice: 'Catatan berhasil dihapus.' },
    });
  };

  return (
    <div className='space-y-4'>
      <NavigationNotice />
      <Link className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline' to={returnTo}>
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
              <Link className='font-semibold text-primary hover:underline' to={returnTo}>
                Kembali ke Notes
              </Link>
            }
          />
        ) : (
          <ErrorState onRetry={detail.retry} />
        )
      ) : null}
      {detail.status === 'success' ? (
        <NoteDetailPane
          key={code}
          actions={<NoteActions key={code} note={detail.data} onDeleted={onDeleted} presentation='buttons' />}
          mode='page'
          note={detail.data}
        />
      ) : null}
    </div>
  );
};

export default NotesDetailPage;
