import { ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { navigationItems } from '../../app/navigation';
import { classNames } from '../../lib/class-names';
import { IconButton } from '../ui/icon-button';
import type { NavigationItem } from '../../app/navigation';

const navItemClassName = ({ isActive }: { isActive: boolean }): string =>
  classNames(
    'relative flex min-h-11 items-center gap-3 rounded-control px-4 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-primary-subtle text-primary' : 'text-ink hover:bg-surface-subtle',
  );

const NavigationGroup = ({ item, onNavigate }: { item: NavigationItem; onNavigate?: () => void }) => {
  const location = useLocation();
  const groupIsActive = item.children?.some((child) => location.pathname.startsWith(child.to)) ?? false;
  const [expanded, setExpanded] = useState(groupIsActive);
  const regionId = `navigation-${item.label.toLowerCase()}`;
  const Icon = item.icon;

  useEffect(() => {
    if (groupIsActive) {
      setExpanded(true);
    }
  }, [groupIsActive]);

  return (
    <li>
      <button
        type='button'
        className={classNames(
          'flex min-h-11 w-full items-center gap-3 rounded-control px-4 py-2.5 text-left text-sm font-medium transition-colors',
          groupIsActive ? 'text-primary' : 'text-ink hover:bg-surface-subtle',
        )}
        aria-controls={regionId}
        aria-expanded={expanded}
        onClick={() => setExpanded((currentValue) => !currentValue)}
      >
        <Icon aria-hidden='true' size={20} strokeWidth={1.8} />
        <span className='flex-1'>{item.label}</span>
        <ChevronDown
          aria-hidden='true'
          className={classNames('transition-transform', expanded && 'rotate-180')}
          size={17}
        />
      </button>
      {expanded ? (
        <ul id={regionId} className='ml-6 border-l border-border py-1 pl-3'>
          {item.children?.map((child) => (
            <li key={child.to}>
              <NavLink className={navItemClassName} to={child.to} onClick={onNavigate}>
                {({ isActive }) => (
                  <>
                    <span
                      className={classNames('size-1.5 rounded-full', isActive ? 'bg-primary' : 'bg-border-strong')}
                      aria-hidden='true'
                    />
                    {child.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
};

const Navigation = ({ onNavigate }: { onNavigate?: () => void }) => (
  <nav aria-label='Navigasi utama' className='flex-1'>
    <ul className='space-y-1'>
      {navigationItems.map((item) => {
        if (item.children !== undefined) {
          return <NavigationGroup key={item.label} item={item} onNavigate={onNavigate} />;
        }

        const Icon = item.icon;
        return (
          <li key={item.label}>
            <NavLink className={navItemClassName} to={item.to ?? '/'} end={item.to === '/'} onClick={onNavigate}>
              <Icon aria-hidden='true' size={20} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          </li>
        );
      })}
    </ul>
  </nav>
);

const Brand = () => <span className='font-display text-3xl font-semibold tracking-tight text-primary'>Hermes</span>;

export const AppShell = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }

      if (event.key === 'Tab') {
        const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        );

        if (focusableElements === undefined || focusableElements.length === 0) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
      menuButtonRef.current?.focus();
    };
  }, [drawerOpen]);

  return (
    <div className='min-h-screen bg-page text-ink'>
      <aside className='fixed inset-y-0 left-0 z-20 hidden w-(--sidebar-width) flex-col border-r border-border bg-surface px-4 py-7 lg:flex'>
        <div className='px-3 pb-9'>
          <Brand />
        </div>
        <Navigation />
      </aside>

      <header className='sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden'>
        <Brand />
        <IconButton ref={menuButtonRef} label='Buka navigasi' onClick={() => setDrawerOpen(true)}>
          <Menu aria-hidden='true' size={22} />
        </IconButton>
      </header>

      {drawerOpen ? (
        <div className='fixed inset-0 z-40 lg:hidden'>
          <button
            type='button'
            className='absolute inset-0 bg-slate-950/35'
            aria-label='Tutup navigasi'
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            ref={drawerRef}
            className='relative flex h-full w-[min(19rem,88vw)] flex-col border-r border-border bg-surface px-4 py-5 shadow-xl'
            role='dialog'
            aria-label='Navigasi'
            aria-modal='true'
          >
            <div className='mb-7 flex items-center justify-between px-3'>
              <Brand />
              <IconButton ref={closeButtonRef} label='Tutup navigasi' onClick={() => setDrawerOpen(false)}>
                <X aria-hidden='true' size={21} />
              </IconButton>
            </div>
            <Navigation onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main className='lg:ml-(--sidebar-width)'>
        <div className='w-full px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12'>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
