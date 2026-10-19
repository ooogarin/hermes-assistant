import { DatePicker } from './date-picker';

type DateRangeFilterProps = {
  /** First day of the range. */
  from: string;
  /** Set when the range ends before it starts. */
  invalid?: boolean;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Last day of the range. */
  to: string;
};

/** The two day pickers that bound a date range filter. */
export const DateRangeFilter = ({ from, invalid = false, onFromChange, onToChange, to }: DateRangeFilterProps) => (
  <>
    <div className='grid gap-2 text-sm font-medium text-ink'>
      Rentang tanggal
      <div className='grid grid-cols-2 gap-3'>
        <DatePicker
          clearable
          className='min-w-0'
          label='Dari tanggal'
          max={to || undefined}
          onChange={onFromChange}
          position='top'
          value={from}
        />
        <DatePicker
          align='end'
          clearable
          className='min-w-0'
          label='Sampai tanggal'
          min={from || undefined}
          onChange={onToChange}
          position='top'
          value={to}
        />
      </div>
    </div>
    {invalid ? <p className='text-sm text-danger'>Tanggal akhir harus sama atau setelah tanggal awal.</p> : null}
  </>
);
