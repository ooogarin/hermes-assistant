import { Info } from 'lucide-react';
import { classNames } from '../../lib/class-names';
import { cefrLevels } from '../../lib/levels';
import { Input } from '../ui/form-field';
import type { LucideIcon } from 'lucide-react';

type SettingsLevelPickerProps = {
  /** The sentence under the heading. */
  description: string;
  /** The level that is currently selected. */
  level: string;
  /** The level that was saved, shown when it is not one of the levels. */
  savedLevel: string;
  onChange: (level: string) => void;
};

/** The grid of CEFR levels used to pick the default level. */
export const SettingsLevelPicker = ({ description, level, onChange, savedLevel }: SettingsLevelPickerProps) => (
  <>
    <legend className='text-xl font-semibold text-ink'>Level default</legend>
    <p className='mt-2 text-sm leading-6 text-ink-muted'>{description}</p>
    <div className='mt-5 grid grid-cols-3 overflow-hidden rounded-control border border-border sm:grid-cols-6'>
      {cefrLevels.map((option) => (
        <button
          key={option}
          className={classNames(
            'min-h-14 border-b border-r border-border text-sm font-semibold transition-colors last:border-r-0 sm:border-b-0',
            level === option
              ? 'bg-primary-subtle text-primary ring-1 ring-inset ring-primary'
              : 'bg-surface text-ink hover:bg-surface-subtle',
          )}
          onClick={() => onChange(option)}
          type='button'
        >
          {option}
        </button>
      ))}
    </div>
    {cefrLevels.includes(savedLevel) ? null : (
      <p className='mt-3 text-sm text-ink-muted'>Nilai tersimpan sebelumnya: {savedLevel}</p>
    )}
  </>
);

type SettingsNumberFieldProps = {
  /** Draws a line between the field and its unit. */
  divided?: boolean;
  disabled?: boolean;
  /** The field id, used to link the label. */
  id: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  /** The unit shown after the number. */
  unit: string;
  value: number;
};

/** A number with a unit, shown as one control. */
export const SettingsNumberField = ({
  divided = false,
  disabled = false,
  id,
  label,
  max,
  min,
  onChange,
  unit,
  value,
}: SettingsNumberFieldProps) => (
  <label className='grid gap-2 text-sm font-medium text-ink' htmlFor={id}>
    {label}
    <span className='flex min-h-12 items-center overflow-hidden rounded-control border border-border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15'>
      <Input
        className='min-h-0 min-w-0 flex-1 border-0 bg-transparent px-4 focus:ring-0'
        disabled={disabled}
        id={id}
        min={min}
        max={max}
        type='number'
        value={Number.isNaN(value) ? '' : value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
      <span className={classNames('px-4 text-ink-muted', divided && 'border-l border-border')}>{unit}</span>
    </span>
  </label>
);

export type SettingsSummaryRow = {
  icon: LucideIcon;
  label: string;
  value: string;
};

type SettingsSummaryProps = {
  /** The sentence below the list. */
  note: string;
  rows: SettingsSummaryRow[];
};

/** The aside that shows the values a feature starts with. */
export const SettingsSummary = ({ note, rows }: SettingsSummaryProps) => (
  <aside className='border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0'>
    <h2 className='text-xl font-semibold text-ink'>Ringkasan default</h2>
    <dl className='mt-5'>
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className='grid grid-cols-[1.5rem_1fr_auto] gap-4 border-b border-border py-5'>
          <Icon aria-hidden='true' className='text-primary' size={20} strokeWidth={1.8} />
          <dt className='text-sm text-ink'>{label}</dt>
          <dd className='max-w-36 text-right text-sm font-medium text-ink'>{value}</dd>
        </div>
      ))}
    </dl>
    <p className='mt-6 flex gap-3 text-sm leading-6 text-ink-muted'>
      <Info aria-hidden='true' className='mt-0.5 shrink-0 text-primary' size={20} />
      {note}
    </p>
  </aside>
);
