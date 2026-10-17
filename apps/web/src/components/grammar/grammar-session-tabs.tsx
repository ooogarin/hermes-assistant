import { NavLink } from 'react-router-dom';
import { classNames } from '../../lib/class-names';

const tabClassName = ({ isActive }: { isActive: boolean }) =>
  classNames(
    'border-b-2 px-1 pb-3 text-sm font-semibold',
    isActive ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink',
  );

export const GrammarSessionTabs = ({ code, reportAvailable }: { code: string; reportAvailable: boolean }) => (
  <nav className='mt-5 flex gap-6 border-b border-border' aria-label='Navigasi sesi Grammar'>
    <NavLink className={tabClassName} end to={`/english/grammar/${code}`}>
      Soal
    </NavLink>
    {reportAvailable ? (
      <NavLink className={tabClassName} to={`/english/grammar/${code}/report`}>
        Laporan
      </NavLink>
    ) : (
      <span
        aria-disabled='true'
        className='cursor-not-allowed border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-ink-muted/50'
        title='Laporan tampil setelah sesi selesai dan hasil evaluasi tersimpan.'
      >
        Laporan
      </span>
    )}
  </nav>
);
