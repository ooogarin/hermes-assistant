import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { NoteDetailPane } from '../../../components/notes/note-detail-pane';
import { Button } from '../../../components/ui/button';
import { ConfirmationDialog } from '../../../components/ui/confirmation-dialog';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { deleteNote, getNote } from '../notes-api';

const NotesDetailPage = () => {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiQuery(code, (signal) => getNote(code, signal));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  const remove = async () => {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteNote(code);
      navigate('/notes', { replace: true, state: { notice: 'Catatan berhasil dihapus.' } });
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
      setDeleteError('Catatan belum dapat dihapus. Coba lagi.');
    }
  };

  return (
    <div className='space-y-4'>
      <NavigationNotice />
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
      {detail.status === 'success' ? (
        <>
          <NoteDetailPane
            actions={
              <>
                <Link
                  className='inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-subtle'
                  to={`/notes/${code}/edit`}
                >
                  <Pencil aria-hidden='true' size={17} /> Edit
                </Link>
                <Button onClick={() => setConfirmOpen(true)} variant='danger'>
                  <Trash2 aria-hidden='true' size={17} /> Hapus
                </Button>
              </>
            }
            mode='page'
            note={detail.data}
          />
          {deleteError === undefined ? null : (
            <p className='text-sm text-danger' role='alert'>
              {deleteError}
            </p>
          )}
          <ConfirmationDialog
            description='Catatan ini tidak akan muncul lagi di daftar Notes.'
            onClose={() => setConfirmOpen(false)}
            onConfirm={remove}
            open={confirmOpen}
            pending={deleting}
            title={`Hapus “${detail.data.title}”?`}
          />
        </>
      ) : null}
    </div>
  );
};

export default NotesDetailPage;
