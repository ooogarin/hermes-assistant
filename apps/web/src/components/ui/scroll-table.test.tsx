import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ScrollTable } from './scroll-table';

const renderTable = (asHeading: boolean) =>
  render(
    <ScrollTable
      asHeading={asHeading}
      columnsLabel='Kolom daftar Contoh'
      countLabel='Menampilkan 1 contoh'
      gridClassName='grid grid-cols-2 gap-4'
      headings={(frozenColumn) => (
        <>
          <span className={`${frozenColumn} px-5 py-3`}>Judul</span>
          <span className='py-3'>Tanggal</span>
        </>
      )}
      label='Daftar Contoh'
      minWidthClassName='min-w-[40rem]'
    >
      {(frozenColumn) => (
        <li key='one'>
          <div className={`${frozenColumn} px-4`}>Satu</div>
        </li>
      )}
    </ScrollTable>,
  );

describe('ScrollTable', () => {
  test('names the table with a visually hidden heading when asked', () => {
    renderTable(true);

    expect(screen.getByRole('heading', { name: 'Daftar Contoh' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Kolom daftar Contoh' })).toBeInTheDocument();
  });

  test('names the table with an accessible name otherwise', () => {
    renderTable(false);

    expect(screen.queryByRole('heading', { name: 'Daftar Contoh' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Kolom daftar Contoh' })).toBeInTheDocument();
  });

  test('shows the count and the rows', () => {
    renderTable(false);

    expect(screen.getByText('Menampilkan 1 contoh')).toBeInTheDocument();
    expect(screen.getByText('Satu')).toBeInTheDocument();
  });
});
