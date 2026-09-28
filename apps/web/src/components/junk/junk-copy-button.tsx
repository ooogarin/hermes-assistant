import { Check, Clipboard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export const JunkCopyButton = ({ value, label }: { value: string; label: string }) => {
  const [status, setStatus] = useState('');
  const resetTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (resetTimer.current !== undefined) window.clearTimeout(resetTimer.current);
    },
    [],
  );
  const copy = async () => {
    if (resetTimer.current !== undefined) window.clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(value);
      setStatus('Berhasil disalin');
      resetTimer.current = window.setTimeout(() => {
        setStatus('');
        resetTimer.current = undefined;
      }, 2_000);
    } catch {
      setStatus('Gagal menyalin. Coba lagi.');
    }
  };
  return (
    <span className='inline-flex shrink-0'>
      <button
        type='button'
        aria-label={label}
        title={status || label}
        onClick={copy}
        className='inline-flex size-7 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
      >
        {status === 'Berhasil disalin' ? (
          <Check aria-hidden='true' size={16} />
        ) : (
          <Clipboard aria-hidden='true' size={16} />
        )}
      </button>
      <span className='sr-only' role='status'>
        {status}
      </span>
    </span>
  );
};
