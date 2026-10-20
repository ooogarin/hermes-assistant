import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ScrollTable, scrollTableRowClassName, scrollTableTitleClassName } from './scroll-table';

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

const renderSharedTable = () =>
  render(
    <ScrollTable
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
          <div className={scrollTableRowClassName}>
            <div className={`${frozenColumn} ${scrollTableTitleClassName}`}>Satu</div>
          </div>
        </li>
      )}
    </ScrollTable>,
  );

describe('ScrollTable', () => {
  test('changes the frozen column background together with the row', () => {
    renderSharedTable();
    const frozenColumn = screen.getByText('Satu');
    const row = frozenColumn.parentElement;

    expect(row).toHaveClass('transition-colors');
    expect(frozenColumn).toHaveClass('transition-colors');
  });

  test('keeps the frozen column shadow even across the row borders', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.getAttribute('aria-label') === 'Kolom daftar Contoh' ? 640 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(960);
    vi.spyOn(HTMLElement.prototype, 'scrollLeft', 'get').mockReturnValue(120);

    renderSharedTable();

    const frozenColumn = screen.getByText('Satu');

    expect(frozenColumn.className).toContain('after:inset-y-0');
    expect(frozenColumn.className).not.toContain('shadow-');
  });

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
