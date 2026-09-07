import { useEffect, useId, useRef } from 'react';
import { Button } from './button';

type ConfirmationDialogProps = {
  confirmLabel?: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  pending?: boolean;
  title: string;
};

export const ConfirmationDialog = ({
  confirmLabel = 'Hapus',
  description,
  onClose,
  onConfirm,
  open,
  pending = false,
  title,
}: ConfirmationDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className='m-auto w-[min(28rem,calc(100%-2rem))] rounded-surface border border-border bg-surface p-0 text-ink shadow-2xl backdrop:bg-slate-950/35'
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      onClose={onClose}
    >
      <div className='p-6 sm:p-7'>
        <h2 id={titleId} className='text-xl font-semibold text-ink'>
          {title}
        </h2>
        <p className='mt-3 text-sm leading-6 text-ink-muted'>{description}</p>
        <div className='mt-7 flex justify-end gap-3'>
          <Button disabled={pending} onClick={onClose} variant='secondary'>
            Batal
          </Button>
          <Button onClick={onConfirm} pending={pending} variant='danger'>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
};
