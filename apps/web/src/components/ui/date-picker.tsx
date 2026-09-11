import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { classNames } from '../../lib/class-names';
import { formatDate } from '../../lib/formatting/formatters';

const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });

const parseDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const toDateValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  className,
  label,
  max,
  min,
  onChange,
  value,
}: {
  className?: string;
  label: string;
  max: string;
  min?: string;
  onChange: (value: string) => void;
  value: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDate(value));
  const calendarDays = getCalendarDays(visibleMonth);
  const previousMonth = shiftMonth(visibleMonth, -1);
  const nextMonth = shiftMonth(visibleMonth, 1);
  const previousDisabled =
    min !== undefined && toDateValue(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0)) < min;
  const nextDisabled = toDateValue(nextMonth) > max;

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
    <div className={classNames('relative min-w-0', className)} ref={containerRef}>
      <button
        type='button'
        className={classNames(
          'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border border-border bg-surface px-4 text-left text-sm text-ink outline-none transition-colors sm:min-h-13 sm:gap-3 sm:text-base',
          'hover:border-border-strong focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15',
        )}
        aria-expanded={open}
        aria-haspopup='dialog'
        aria-label={`${label}: ${formatDate(value)}`}
        onClick={toggle}
        ref={triggerRef}
      >
        <CalendarDays aria-hidden='true' className='shrink-0 text-ink-muted' size={18} />
        <span className='whitespace-nowrap'>{formatDate(value)}</span>
      </button>

      {open ? (
        <section
          className='absolute top-full left-0 z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-surface border border-border-strong bg-surface p-3 shadow-lg'
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
            <strong className='text-sm font-semibold capitalize text-ink'>{monthFormatter.format(visibleMonth)}</strong>
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
              const disabled = dateValue > max || (min !== undefined && dateValue < min);
              const selected = dateValue === value;
              const outsideMonth = date.getMonth() !== visibleMonth.getMonth();

              return (
                <button
                  type='button'
                  className={classNames(
                    'grid aspect-square place-items-center rounded-control text-sm transition-colors',
                    selected ? 'bg-primary font-semibold text-white' : 'text-ink hover:bg-primary-subtle',
                    outsideMonth && !selected && 'text-ink-muted/55',
                    disabled && 'cursor-not-allowed opacity-25 hover:bg-transparent',
                  )}
                  aria-current={selected ? 'date' : undefined}
                  aria-label={formatDate(dateValue)}
                  disabled={disabled}
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
