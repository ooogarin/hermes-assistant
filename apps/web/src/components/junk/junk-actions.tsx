import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteJunkItem } from '../../features/junk/junk-api';
import { getJunkTitle } from '../../features/junk/junk-display';
import { useDismissOnOutside } from '../../lib/hooks/use-dismiss-on-outside';
import { Button } from '../ui/button';
import { ButtonLink } from '../ui/button-link';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { IconButton } from '../ui/icon-button';
import type { JunkItem } from '../../features/junk/junk-api';

export const JunkActions = ({
  item,
  onDeleted,
  presentation = 'menu',
}: {
  item: JunkItem;
  onDeleted: () => void;
  presentation?: 'menu' | 'buttons';
}) => {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  const { containerRef, triggerRef } = useDismissOnOutside<HTMLDivElement, HTMLButtonElement>({
    active: open,
    dismissOnFocusOut: true,
    onDismiss: () => setOpen(false),
    restoreFocus: true,
  });
  const closeDialog = () => {
    setConfirm(false);
    triggerRef.current?.focus();
  };
  const remove = async () => {
    setPending(true);
    setError('');
    try {
      await deleteJunkItem(item.code);
      onDeleted();
    } catch {
      setError('Junk belum dapat dihapus. Coba lagi.');
      closeDialog();
    } finally {
      setPending(false);
    }
  };
  if (presentation === 'buttons') {
    return (
      <>
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          <ButtonLink
            icon={<Pencil aria-hidden='true' size={17} />}
            label='Edit'
            to={`/junk/${item.code}/edit`}
            variant='secondary'
          />
          <Button onClick={() => setConfirm(true)} variant='danger'>
            <Trash2 aria-hidden='true' size={17} />
            Hapus
          </Button>
        </div>
        {error ? (
          <p role='alert' className='basis-full text-sm text-danger'>
            {error}
          </p>
        ) : null}
        <ConfirmationDialog
          open={confirm}
          pending={pending}
          onClose={closeDialog}
          onConfirm={remove}
          title={`Hapus “${getJunkTitle(item)}”?`}
          description='Item ini tidak akan muncul lagi di daftar Junk.'
        />
      </>
    );
  }
  return (
    <div className='relative' ref={containerRef}>
      <IconButton
        ref={triggerRef}
        label='Aksi Junk'
        title='Aksi Junk'
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setError('');
          setOpen(!open);
        }}
      >
        <EllipsisVertical aria-hidden='true' size={19} />
      </IconButton>
      {open ? (
        <div
          id={id}
          className='absolute right-0 top-full z-20 mt-2 w-36 rounded-control border border-border bg-surface p-1 shadow-lg'
        >
          <Link
            className='flex items-center gap-2 rounded-control px-3 py-2 text-sm text-ink hover:bg-surface-subtle focus:bg-surface-subtle'
            to={`/junk/${item.code}/edit`}
          >
            <Pencil aria-hidden='true' size={16} />
            Edit
          </Link>
          <button
            type='button'
            className='flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm text-danger hover:bg-surface-subtle focus:bg-surface-subtle'
            onClick={() => {
              setOpen(false);
              setConfirm(true);
            }}
          >
            <Trash2 aria-hidden='true' size={16} />
            Hapus
          </button>
        </div>
      ) : null}
      {error ? (
        <p
          role='alert'
          className='absolute right-0 top-full z-10 mt-2 w-64 rounded-control border border-border bg-surface p-3 text-sm text-danger shadow-lg'
        >
          {error}
        </p>
      ) : null}
      <ConfirmationDialog
        open={confirm}
        pending={pending}
        onClose={closeDialog}
        onConfirm={remove}
        title={`Hapus “${getJunkTitle(item)}”?`}
        description='Item ini tidak akan muncul lagi di daftar Junk.'
      />
    </div>
  );
};
