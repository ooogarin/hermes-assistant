import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { classNames } from '../../lib/class-names';
import { hasOpenDismissLayer } from '../../lib/hooks/use-dismiss-on-outside';
import { IconButton } from '../ui/icon-button';
import { Navigation } from './navigation';
import { Brand, DesktopSidebar, LogoutAction } from './sidebar';

const sidebarStorageKey = 'hermes-sidebar-expanded';

export const AppShell = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(
    () => window.localStorage.getItem(sidebarStorageKey) !== 'false',
  );
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    window.localStorage.setItem(sidebarStorageKey, String(sidebarExpanded));
  }, [sidebarExpanded]);

  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      // An open layer on the page takes the Escape key, so the drawer stays.
      if (event.key === 'Escape' && !hasOpenDismissLayer()) setDrawerOpen(false);

      if (event.key === 'Tab') {
        const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        );

        if (focusableElements === undefined || focusableElements.length === 0) return;
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
    <div className='app-shell min-h-screen bg-page text-ink'>
      <DesktopSidebar expanded={sidebarExpanded} onExpandedChange={setSidebarExpanded} />

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
            <LogoutAction />
          </aside>
        </div>
      ) : null}

      <main
        className={classNames(
          'app-shell-content',
          sidebarExpanded ? 'lg:ml-(--sidebar-width)' : 'lg:ml-(--sidebar-collapsed-width)',
        )}
      >
        <div className='w-full px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12'>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
