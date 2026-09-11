import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftDate } from '../../features/finance/finance-date';
import { DatePicker } from '../ui/date-picker';
import { IconButton } from '../ui/icon-button';

export const DailyDateControls = ({
  date,
  max,
  onChange,
}: {
  date: string;
  max: string;
  onChange: (date: string) => void;
}) => (
  <div className='flex w-full items-center gap-2'>
    <IconButton className='size-11 sm:size-13' label='Hari sebelumnya' onClick={() => onChange(shiftDate(date, -1))}>
      <ChevronLeft aria-hidden='true' size={20} />
    </IconButton>
    <DatePicker
      className='min-w-0 flex-1 sm:min-w-56 sm:flex-none'
      label='Tanggal transaksi'
      max={max}
      onChange={onChange}
      value={date}
    />
    <IconButton
      className='size-11 sm:size-13'
      label='Hari berikutnya'
      disabled={date >= max}
      onClick={() => onChange(shiftDate(date, 1))}
    >
      <ChevronRight aria-hidden='true' size={20} />
    </IconButton>
  </div>
);

export const RangeDateControls = ({
  from,
  max,
  onFromChange,
  onToChange,
  to,
}: {
  from: string;
  max: string;
  onFromChange: (date: string) => void;
  onToChange: (date: string) => void;
  to: string;
}) => (
  <fieldset className='flex flex-col gap-2 sm:flex-row sm:items-center'>
    <legend className='sr-only'>Rentang tanggal laporan</legend>
    <DatePicker className='sm:min-w-52' label='Tanggal mulai' max={to} onChange={onFromChange} value={from} />
    <span className='hidden text-sm text-ink-muted sm:inline' aria-hidden='true'>
      —
    </span>
    <DatePicker className='sm:min-w-52' label='Tanggal akhir' max={max} min={from} onChange={onToChange} value={to} />
  </fieldset>
);
