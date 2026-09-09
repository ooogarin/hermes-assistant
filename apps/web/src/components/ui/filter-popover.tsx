import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from './button';
import type { ReactNode } from 'react';

type FilterPopoverProps = {
  activeCount: number;
  children: ReactNode;
  id: string;
  label: string;
  onClose: () => void;
  onToggle: () => void;
  open: boolean;
};

export const FilterPopover = ({ activeCount, children, id, label, onClose, onToggle, open }: FilterPopoverProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, open]);

  return (
    <div className='relative flex' ref={containerRef}>
      <Button
        aria-controls={id}
        aria-expanded={open}
        className='h-12 w-full lg:w-auto'
        onClick={onToggle}
        variant='secondary'
      >
        <SlidersHorizontal aria-hidden='true' size={18} />
        Filter
        {activeCount > 0 ? (
          <span className='inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-white'>
            {activeCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <section
          aria-label={label}
          className='absolute top-full right-0 z-20 mt-2 w-[min(24.5rem,calc(100vw-2.5rem))] rounded-surface border border-border-strong bg-surface p-5 shadow-lg'
          id={id}
        >
          {children}
        </section>
      ) : null}
    </div>
  );
};
