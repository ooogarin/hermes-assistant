import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { JunkDetailPane } from '../../../components/junk/junk-detail-pane';
import { Button } from '../../../components/ui/button';
import { ConfirmationDialog } from '../../../components/ui/confirmation-dialog';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { deleteJunkItem, getJunkItem } from '../junk-api';
import { getJunkTitle } from '../junk-display';

const JunkDetailPage = () => {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiQuery(code, (signal) => getJunkItem(code, signal));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  const remove = async () => {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteJunkItem(code);
      navigate('/junk', { replace: true, state: { notice: 'Junk berhasil dihapus.' } });
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
      setDeleteError('Junk belum dapat dihapus. Coba lagi.');
    }
  };

  return (
    <div className='space-y-4'>
      <NavigationNotice />
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
      {detail.status === 'success' ? (
        <>
          <JunkDetailPane
            actions={
              <>
                <Link
                  className='inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-subtle'
                  to={`/junk/${code}/edit`}
                >
                  <Pencil aria-hidden='true' size={17} /> Edit
                </Link>
                <Button onClick={() => setConfirmOpen(true)} variant='danger'>
                  <Trash2 aria-hidden='true' size={17} /> Hapus
                </Button>
              </>
            }
            item={detail.data}
            mode='page'
          />
          {deleteError === undefined ? null : (
            <p className='text-sm text-danger' role='alert'>
              {deleteError}
            </p>
          )}
          <ConfirmationDialog
            description='Item ini tidak akan muncul lagi di daftar Junk.'
            onClose={() => setConfirmOpen(false)}
            onConfirm={remove}
            open={confirmOpen}
            pending={deleting}
            title={`Hapus “${getJunkTitle(detail.data)}”?`}
          />
        </>
      ) : null}
    </div>
  );
};

export default JunkDetailPage;
