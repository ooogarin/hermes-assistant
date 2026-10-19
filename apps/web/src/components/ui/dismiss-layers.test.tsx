import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { ChoiceDropdown } from './choice-dropdown';
import { DatePicker } from './date-picker';
import { FilterPopover } from './filter-popover';

const Harness = ({ kind }: { kind: 'choice' | 'date' }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('2026-09-08');

  return (
    <FilterPopover
      activeCount={0}
      id='layer-filters'
      label='Filter'
      onClose={() => setOpen(false)}
      onToggle={() => setOpen(!open)}
      open={open}
    >
      {kind === 'date' ? (
        <DatePicker label='Dari tanggal' onChange={setValue} value={value} />
      ) : (
        <ChoiceDropdown
          label='Tipe'
          mode='single'
          onChange={(next) => setValue(next ?? '')}
          options={[{ label: 'Fact', value: 'fact' }]}
          placeholder='Semua tipe'
          value={null}
        />
      )}
    </FilterPopover>
  );
};

describe('nested dismiss layers', () => {
  test('Escape closes only the calendar inside a filter popover', async () => {
    const user = userEvent.setup();
    render(<Harness kind='date' />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('button', { name: /Dari tanggal/ }));

    expect(screen.getByRole('dialog', { name: 'Dari tanggal' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Dari tanggal' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Filter' })).toBeInTheDocument();
  });

  test('Escape closes only the dropdown inside a filter popover', async () => {
    const user = userEvent.setup();
    render(<Harness kind='choice' />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('button', { name: 'Buka tipe' }));

    expect(screen.getByRole('listbox', { name: 'Tipe' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox', { name: 'Tipe' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Filter' })).toBeInTheDocument();
  });

  test('a pointer down outside closes the popover and the calendar', async () => {
    const user = userEvent.setup();
    render(<Harness kind='date' />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('button', { name: /Dari tanggal/ }));
    await user.click(document.body);

    expect(screen.queryByRole('dialog', { name: 'Dari tanggal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Filter' })).not.toBeInTheDocument();
  });
});
