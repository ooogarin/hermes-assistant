import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { ChoiceDropdown } from './choice-dropdown';
import { TagInput } from './tag-input';

const levelOptions = ['A1', 'A2', 'B1'].map((value) => ({ label: value, value }));

const MultiChoice = () => {
  const [value, setValue] = useState(['A1']);
  return (
    <ChoiceDropdown
      label='Level'
      mode='multiple'
      onChange={setValue}
      options={levelOptions}
      placeholder='Semua level'
      value={value}
    />
  );
};

const SingleChoice = () => {
  const [value, setValue] = useState<string | null>(null);
  return (
    <ChoiceDropdown
      label='Tipe'
      mode='single'
      onChange={setValue}
      options={[
        { label: 'Fact', value: 'fact' },
        { label: 'Idea', value: 'idea' },
      ]}
      placeholder='Pilih tipe'
      searchable={false}
      value={value}
    />
  );
};

const Tags = () => {
  const [value, setValue] = useState<string[]>([]);
  return <TagInput label='Tags' onChange={setValue} value={value} />;
};

describe('shared form controls', () => {
  test('keeps a multi choice open while toggling checkbox-style options', async () => {
    const user = userEvent.setup();
    render(<MultiChoice />);

    await user.click(screen.getByRole('button', { name: 'Buka level' }));
    await user.click(screen.getByRole('option', { name: 'B1' }));

    expect(screen.getByRole('button', { name: 'Hapus B1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tutup level' })).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: 'Hapus pilihan level' }));
    expect(screen.getByText('Semua level')).toBeInTheDocument();
  });

  test('closes a single choice after selecting a radio-style option', async () => {
    const user = userEvent.setup();
    render(<SingleChoice />);

    await user.click(screen.getByRole('button', { name: 'Buka tipe' }));
    await user.click(screen.getByRole('option', { name: 'Fact' }));

    expect(screen.getByText('Fact')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buka tipe' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('adds and removes tags as discrete values', async () => {
    const user = userEvent.setup();
    render(<Tags />);

    await user.type(screen.getByRole('textbox', { name: 'Tags' }), 'knowledge');
    await user.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(screen.getByText('knowledge')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hapus tag knowledge' }));
    expect(screen.queryByText('knowledge')).not.toBeInTheDocument();
  });
});
