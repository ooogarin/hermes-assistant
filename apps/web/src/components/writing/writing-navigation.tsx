import { Plus } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { classNames } from '../../lib/class-names';
import { EnglishSettingsLink } from '../english/english-settings-link';
import { PageHeader } from '../layout/page-header';
import { ButtonLink } from '../ui/button-link';

export const WritingNavigation = () => (
  <>
    <PageHeader
      title='Writing'
      actions={
        <div className='flex flex-wrap items-center gap-3'>
          <EnglishSettingsLink to='/english/writing/settings' />
          <ButtonLink icon={<Plus aria-hidden='true' size={18} />} label='Tulis bebas' to='/english/writing/new' />
        </div>
      }
    />
    <nav className='flex gap-6 border-b border-border' aria-label='Koleksi Writing'>
      {[
        { label: 'Tulisan', to: '/english/writing' },
        { label: 'Prompt', to: '/english/writing/materials' },
      ].map((item) => (
        <NavLink
          className={({ isActive }) =>
            classNames(
              'border-b-2 px-1 pb-3 text-sm font-semibold',
              isActive ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink',
            )
          }
          end
          key={item.to}
          to={item.to}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  </>
);
