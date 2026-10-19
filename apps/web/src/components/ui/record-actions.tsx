import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDismissOnOutside } from '../../lib/hooks/use-dismiss-on-outside';
import { Button } from './button';
import { ButtonLink } from './button-link';
import { ConfirmationDialog } from './confirmation-dialog';
import { IconButton } from './icon-button';

type RecordActionsProps = {
  /** Message shown when the record could not be deleted. */
  deleteError: string;
  /** Path of the edit page for the record. */
  editTo: string;
  /** Accessible name of the menu trigger. */
  menuLabel: string;
  /** Deletes the record. */
  onDelete: () => Promise<void>;
  /** Called once the record was deleted. */
  onDeleted: () => void;
  /** Explanation shown in the confirmation dialog. */
  removalDescription: string;
  /** Title of the record, used in the confirmation dialog. */
  title: string;
  presentation?: 'buttons' | 'menu';
};

/**
 * The edit and delete actions of a stored record, offered as a menu or as
 * plain buttons. The feature keeps the wording, the primitive keeps the flow.
 */
export const RecordActions = ({
  deleteError,
  editTo,
  menuLabel,
  onDelete,
  onDeleted,
  presentation = 'menu',
  removalDescription,
  title,
}: RecordActionsProps) => {
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
      await onDelete();
      onDeleted();
    } catch {
      setError(deleteError);
      closeDialog();
    } finally {
      setPending(false);
    }
  };

  if (presentation === 'buttons') {
    return (
      <>
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          <ButtonLink icon={<Pencil aria-hidden='true' size={17} />} label='Edit' to={editTo} variant='secondary' />
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
          description={removalDescription}
          onClose={closeDialog}
          onConfirm={remove}
          open={confirm}
          pending={pending}
          title={`Hapus “${title}”?`}
        />
      </>
    );
  }

  return (
    <div className='relative' ref={containerRef}>
      <IconButton
        ref={triggerRef}
        aria-controls={id}
        aria-expanded={open}
        label={menuLabel}
        onClick={() => {
          setError('');
          setOpen(!open);
        }}
        title={menuLabel}
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
            to={editTo}
          >
            <Pencil aria-hidden='true' size={16} />
            Edit
          </Link>
          <button
            className='flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm text-danger hover:bg-surface-subtle focus:bg-surface-subtle'
            onClick={() => {
              setOpen(false);
              setConfirm(true);
            }}
            type='button'
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
        description={removalDescription}
        onClose={closeDialog}
        onConfirm={remove}
        open={confirm}
        pending={pending}
        title={`Hapus “${title}”?`}
      />
    </div>
  );
};
