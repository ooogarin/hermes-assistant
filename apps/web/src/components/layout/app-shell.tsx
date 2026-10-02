import { ChevronDown, ChevronLeft, ChevronRight, Feather, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/auth/auth-context';
import { navigationItems } from '../../app/navigation';
import { classNames } from '../../lib/class-names';
import { confirmDiscardChanges } from '../../lib/hooks/use-unsaved-changes';
import { IconButton } from '../ui/icon-button';
import type { NavigationItem } from '../../app/navigation';

type NavigationProps = {
  collapsed?: boolean;
  onExpand?: () => void;
  onNavigate?: () => void;
};

const sidebarStorageKey = 'hermes-sidebar-expanded';

const NavigationLabel = ({ collapsed, label }: { collapsed: boolean; label: string }) => (
  <span className={classNames('min-w-0 flex-1 truncate', collapsed && 'sr-only')}>{label}</span>
);

const navItemClassName =
  (collapsed: boolean) =>
  ({ isActive }: { isActive: boolean }): string =>
    classNames(
      'relative flex min-h-12 items-center rounded-control text-sm font-medium transition-colors',
      collapsed ? 'justify-center px-3' : 'gap-3 px-4',
      isActive ? 'bg-primary-subtle text-primary' : 'text-ink hover:bg-surface-subtle',
    );

const NavigationGroup = ({
  collapsed = false,
  item,
  onExpand,
  onNavigate,
}: NavigationProps & { item: NavigationItem }) => {
  const location = useLocation();
  const groupIsActive = item.children?.some((child) => location.pathname.startsWith(child.to)) ?? false;
  const [expanded, setExpanded] = useState(groupIsActive);
  const regionId = `navigation-${item.label.toLowerCase()}`;
  const Icon = item.icon;

  useEffect(() => {
    if (groupIsActive) setExpanded(true);
  }, [groupIsActive]);

  const toggle = () => {
    if (collapsed) {
      onExpand?.();
      setExpanded(true);
      return;
    }
    setExpanded((currentValue) => !currentValue);
  };

  return (
    <li>
      <button
        type='button'
        className={classNames(
          'relative flex min-h-12 w-full items-center rounded-control text-left text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-3' : 'gap-3 px-4',
          groupIsActive ? 'text-primary' : 'text-ink hover:bg-surface-subtle',
        )}
        aria-controls={collapsed ? undefined : regionId}
        aria-expanded={collapsed ? undefined : expanded}
        aria-label={collapsed ? item.label : undefined}
        onClick={toggle}
      >
        <Icon aria-hidden='true' size={21} strokeWidth={1.8} />
        <NavigationLabel collapsed={collapsed} label={item.label} />
        {collapsed ? null : (
          <ChevronDown
            aria-hidden='true'
            className={classNames('transition-transform', expanded && 'rotate-180')}
            size={17}
          />
        )}
      </button>
      {!collapsed && expanded ? (
        <ul id={regionId} className='ml-6 border-l border-border py-1 pl-3'>
          {item.children?.map((child) => (
            <li key={child.to}>
              <NavLink className={navItemClassName(false)} to={child.to} onClick={onNavigate}>
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

const Navigation = ({ collapsed = false, onExpand, onNavigate }: NavigationProps) => (
  <nav aria-label='Navigasi utama' className='flex-1'>
    <ul className='space-y-1.5'>
      {navigationItems.map((item) => {
        if (item.children !== undefined) {
          return (
            <NavigationGroup
              key={item.label}
              collapsed={collapsed}
              item={item}
              onExpand={onExpand}
              onNavigate={onNavigate}
            />
          );
        }

        const Icon = item.icon;
        return (
          <li key={item.label}>
            <NavLink
              aria-label={collapsed ? item.label : undefined}
              className={navItemClassName(collapsed)}
              to={item.to ?? '/'}
              end={item.to === '/'}
              onClick={onNavigate}
            >
              <Icon aria-hidden='true' size={21} strokeWidth={1.8} />
              <NavigationLabel collapsed={collapsed} label={item.label} />
            </NavLink>
          </li>
        );
      })}
    </ul>
  </nav>
);

const Brand = ({ collapsed = false }: { collapsed?: boolean }) => (
  <div className={classNames('flex items-center text-primary', collapsed ? 'justify-center' : 'gap-2.5')}>
    <Feather aria-hidden='true' className='shrink-0' size={28} strokeWidth={1.8} />
    <span className={classNames('font-display text-3xl font-semibold tracking-tight', collapsed && 'sr-only')}>
      Hermes
    </span>
  </div>
);

const LogoutAction = ({ collapsed = false, onError }: { collapsed?: boolean; onError?: () => void }) => {
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const handleLogout = async () => {
    if (pending || !confirmDiscardChanges()) {
      return;
    }

    setPending(true);
    setError(false);

    try {
      await logout();
    } catch {
      onError?.();
      setError(true);
      setPending(false);
    }
  };

  return (
    <div className='border-t border-border pt-4'>
      <button
        type='button'
        className={classNames(
          'flex min-h-12 w-full items-center rounded-control text-sm font-medium text-ink hover:bg-surface-subtle',
          collapsed ? 'justify-center' : 'gap-3 px-4',
        )}
        aria-label={collapsed ? 'Keluar' : undefined}
        aria-busy={pending || undefined}
        disabled={pending}
        title={collapsed ? 'Keluar' : undefined}
        onClick={() => void handleLogout()}
      >
        <LogOut aria-hidden='true' size={21} strokeWidth={1.8} />
        {collapsed ? null : pending ? 'Mengeluarkan…' : 'Keluar'}
      </button>
      {error ? (
        <p className='mt-2 text-xs text-danger' role='alert'>
          Belum bisa keluar. Coba lagi.
        </p>
      ) : null}
    </div>
  );
};

type DesktopSidebarProps = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

const DesktopSidebar = ({ expanded, onExpandedChange }: DesktopSidebarProps) => {
  return (
    <aside
      className={classNames(
        'fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface',
        'transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block',
        expanded ? 'w-(--sidebar-width)' : 'w-(--sidebar-collapsed-width)',
      )}
    >
      <button
        type='button'
        className='absolute -right-3 top-7 z-20 grid size-7 place-items-center rounded-full border border-border bg-surface text-ink shadow-sm transition-colors hover:border-border-strong hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
        aria-expanded={expanded}
        aria-label={expanded ? 'Ciutkan sidebar' : 'Buka sidebar'}
        onClick={() => onExpandedChange(!expanded)}
      >
        {expanded ? <ChevronLeft aria-hidden='true' size={16} /> : <ChevronRight aria-hidden='true' size={16} />}
      </button>
      <div className={classNames('flex h-full flex-col overflow-hidden py-7', expanded ? 'px-4' : 'px-3')}>
        <div className={classNames('pb-9', expanded && 'px-3')}>
          <Brand collapsed={!expanded} />
        </div>
        <Navigation collapsed={!expanded} onExpand={() => onExpandedChange(true)} />
        <LogoutAction collapsed={!expanded} onError={() => onExpandedChange(true)} />
      </div>
    </aside>
  );
};

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
      if (event.key === 'Escape') setDrawerOpen(false);

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
    <div className='min-h-screen bg-page text-ink'>
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
          'transition-[margin] duration-200 ease-out motion-reduce:transition-none',
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
