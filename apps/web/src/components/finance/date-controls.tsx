import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftDate } from '../../features/finance/finance-date';
import { IconButton } from '../ui/icon-button';

export const DateInput = ({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: string;
  min?: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <label className='flex min-h-11 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm text-ink'>
    <CalendarDays aria-hidden='true' className='shrink-0 text-ink-muted' size={18} />
    <span className='sr-only'>{label}</span>
    <input
      type='date'
      className='min-w-0 bg-transparent outline-none'
      aria-label={label}
      max={max}
      min={min}
      value={value}
      onChange={(event) => event.target.value && onChange(event.target.value)}
    />
  </label>
);

export const DailyDateControls = ({
  date,
  max,
  onChange,
}: {
  date: string;
  max: string;
  onChange: (date: string) => void;
}) => (
  <div className='flex items-center gap-2'>
    <IconButton label='Hari sebelumnya' onClick={() => onChange(shiftDate(date, -1))}>
      <ChevronLeft aria-hidden='true' size={20} />
    </IconButton>
    <DateInput label='Tanggal transaksi' max={max} onChange={onChange} value={date} />
    <IconButton label='Hari berikutnya' disabled={date >= max} onClick={() => onChange(shiftDate(date, 1))}>
      <ChevronRight aria-hidden='true' size={20} />
    </IconButton>
  </div>
);
