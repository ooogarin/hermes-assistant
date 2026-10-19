import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { classNames } from '../../lib/class-names';
import { formatDate, formatMonth } from '../../lib/formatting/formatters';

const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const toDateValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isValidDateValue = (value: string | undefined): value is string => {
  if (value === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return toDateValue(new Date(year, month - 1, day)) === value;
};

const parseDate = (value: string): Date => {
  if (!isValidDateValue(value)) return new Date();

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getCalendarDays = (month: Date): Date[] => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const shiftMonth = (month: Date, amount: number): Date => new Date(month.getFullYear(), month.getMonth() + amount, 1);

export const DatePicker = ({
  align = 'start',
  className,
  clearable = false,
  disabled = false,
  label,
  max,
  min,
  onChange,
  position = 'bottom',
  value,
}: {
  align?: 'start' | 'end';
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  position?: 'top' | 'bottom';
  value: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDate(value));
  const dateLabel = isValidDateValue(value) ? formatDate(value) : undefined;
  const minDate = isValidDateValue(min) ? min : undefined;
  const maxDate = isValidDateValue(max) ? max : undefined;
  const calendarDays = getCalendarDays(visibleMonth);
  const previousMonth = shiftMonth(visibleMonth, -1);
  const nextMonth = shiftMonth(visibleMonth, 1);
  const previousDisabled =
    minDate !== undefined && toDateValue(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0)) < minDate;
  const nextDisabled = maxDate !== undefined && toDateValue(nextMonth) > maxDate;

  useEffect(() => {
    if (!open) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggle = () => {
    setVisibleMonth(parseDate(value));
    setOpen((current) => !current);
  };

  return (
    <div className={classNames('relative flex min-w-0 items-center gap-1', className)} ref={containerRef}>
      <button
        type='button'
        className={classNames(
          'flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-control border border-border bg-surface px-3 text-left text-sm text-ink outline-none transition-colors sm:min-h-13 sm:gap-3 sm:px-4 sm:text-base',
          'hover:border-border-strong focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15',
          'disabled:cursor-not-allowed disabled:opacity-55',
        )}
        aria-expanded={open}
        aria-haspopup='dialog'
        aria-label={`${label}: ${dateLabel ?? 'Belum dipilih'}`}
        onClick={toggle}
        disabled={disabled}
        ref={triggerRef}
      >
        <CalendarDays aria-hidden='true' className='shrink-0 text-ink-muted' size={18} />
        <span className='truncate whitespace-nowrap'>{dateLabel ?? 'Pilih tanggal'}</span>
      </button>
      {clearable && value ? (
        <button
          type='button'
          aria-label={`Hapus ${label.toLowerCase()}`}
          className='grid size-9 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-55'
          disabled={disabled}
          onClick={() => {
            onChange('');
            setOpen(false);
            triggerRef.current?.focus();
          }}
        >
          <X aria-hidden='true' size={16} />
        </button>
      ) : null}

      {open ? (
        <section
          className={classNames(
            'absolute z-40 w-[min(18rem,calc(100vw-2rem))] rounded-surface border border-border-strong bg-surface p-3 shadow-lg',
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            align === 'end' ? 'right-0' : 'left-0',
          )}
          aria-label={label}
          role='dialog'
        >
          <div className='mb-3 flex items-center justify-between'>
            <button
              type='button'
              className='grid size-9 place-items-center rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-35'
              aria-label='Bulan sebelumnya'
              disabled={previousDisabled}
              onClick={() => setVisibleMonth(previousMonth)}
            >
              <ChevronLeft aria-hidden='true' size={18} />
            </button>
            <strong className='text-sm font-semibold capitalize text-ink'>{formatMonth(visibleMonth)}</strong>
            <button
              type='button'
              className='grid size-9 place-items-center rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-35'
              aria-label='Bulan berikutnya'
              disabled={nextDisabled}
              onClick={() => setVisibleMonth(nextMonth)}
            >
              <ChevronRight aria-hidden='true' size={18} />
            </button>
          </div>

          <div className='grid grid-cols-7 gap-1 text-center'>
            {weekdays.map((weekday) => (
              <span className='py-1 text-xs font-medium text-ink-muted' key={weekday}>
                {weekday}
              </span>
            ))}
            {calendarDays.map((date) => {
              const dateValue = toDateValue(date);
              const dateDisabled =
                (maxDate !== undefined && dateValue > maxDate) || (minDate !== undefined && dateValue < minDate);
              const selected = dateLabel !== undefined && dateValue === value;
              const outsideMonth = date.getMonth() !== visibleMonth.getMonth();

              return (
                <button
                  type='button'
                  className={classNames(
                    'grid aspect-square place-items-center rounded-control text-sm transition-colors',
                    selected ? 'bg-primary font-semibold text-white' : 'text-ink hover:bg-primary-subtle',
                    outsideMonth && !selected && 'text-ink-muted/55',
                    dateDisabled && 'cursor-not-allowed opacity-25 hover:bg-transparent',
                  )}
                  aria-current={selected ? 'date' : undefined}
                  aria-label={formatDate(dateValue)}
                  disabled={dateDisabled}
                  key={dateValue}
                  onClick={() => {
                    onChange(dateValue);
                    setOpen(false);
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
};
