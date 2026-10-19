import { ChevronDown, Feather, LogOut, Menu, PanelLeft, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/auth/auth-context';
import { navigationItems } from '../../app/navigation';
import { classNames } from '../../lib/class-names';
import { hasOpenDismissLayer } from '../../lib/hooks/use-dismiss-on-outside';
import { confirmDiscardChanges } from '../../lib/hooks/use-unsaved-changes';
import { IconButton } from '../ui/icon-button';
import { useTooltip } from '../ui/tooltip';
import type { NavigationChild, NavigationItem } from '../../app/navigation';

type NavigationProps = {
  collapsed?: boolean;
  onExpand?: () => void;
  onNavigate?: () => void;
};

const sidebarStorageKey = 'hermes-sidebar-expanded';

const NavigationLabel = ({ collapsed, label }: { collapsed: boolean; label: string }) => (
  <span className='sidebar-label' data-collapsed={collapsed}>
    {label}
  </span>
);

const navItemClassName =
  (child = false) =>
  ({ isActive }: { isActive: boolean }): string =>
    classNames(
      'sidebar-nav-row rounded-control text-sm font-medium',
      child && 'sidebar-nav-child',
      isActive ? 'sidebar-nav-active text-white' : 'text-ink hover:bg-surface-subtle',
    );

const NavigationLink = ({ collapsed = false, item, onNavigate }: NavigationProps & { item: NavigationItem }) => {
  const { tooltip, triggerProps, triggerRef } = useTooltip<HTMLAnchorElement>({
    content: item.label,
    enabled: collapsed,
  });
  const Icon = item.icon;

  return (
    <li>
      <NavLink
        aria-label={collapsed ? item.label : undefined}
        className={navItemClassName()}
        to={item.to ?? '/'}
        end={item.to === '/'}
        onClick={onNavigate}
        ref={triggerRef}
        {...triggerProps}
      >
        <Icon aria-hidden='true' size={21} strokeWidth={1.8} />
        <NavigationLabel collapsed={collapsed} label={item.label} />
      </NavLink>
      {tooltip}
    </li>
  );
};

const NavigationChildLink = ({
  collapsed = false,
  child,
  onNavigate,
}: NavigationProps & { child: NavigationChild }) => {
  const { tooltip, triggerProps, triggerRef } = useTooltip<HTMLAnchorElement>({
    content: child.label,
    enabled: collapsed,
  });

  return (
    <li>
      <NavLink
        aria-label={collapsed ? child.label : undefined}
        className={navItemClassName(true)}
        to={child.to}
        onClick={onNavigate}
        ref={triggerRef}
        {...triggerProps}
      >
        <span className='sidebar-dot' aria-hidden='true' />
        <NavigationLabel collapsed={collapsed} label={child.label} />
      </NavLink>
      {tooltip}
    </li>
  );
};

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
  const { tooltip, triggerProps, triggerRef } = useTooltip<HTMLButtonElement>({
    content: item.label,
    enabled: collapsed,
  });

  useEffect(() => {
    if (groupIsActive) {
      setExpanded(true);
    }
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
    <li className='flow-root'>
      <button
        type='button'
        className={classNames(
          'sidebar-nav-row rounded-control text-left text-sm font-medium',
          groupIsActive ? 'text-primary' : 'text-ink hover:bg-surface-subtle',
        )}
        aria-controls={expanded ? regionId : undefined}
        aria-expanded={expanded}
        aria-label={collapsed ? item.label : undefined}
        onClick={toggle}
        ref={triggerRef}
        {...triggerProps}
      >
        <Icon aria-hidden='true' size={21} strokeWidth={1.8} />
        <NavigationLabel collapsed={collapsed} label={item.label} />
        <span className='sidebar-label ml-auto' data-collapsed={collapsed}>
          <ChevronDown
            aria-hidden='true'
            className={classNames('sidebar-chevron', expanded && 'rotate-180')}
            size={17}
          />
        </span>
      </button>
      {tooltip}
      {expanded ? (
        <ul id={regionId} className='sidebar-submenu' data-collapsed={collapsed}>
          {item.children?.map((child) => (
            <NavigationChildLink collapsed={collapsed} child={child} key={child.to} onNavigate={onNavigate} />
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

        return <NavigationLink collapsed={collapsed} item={item} key={item.label} onNavigate={onNavigate} />;
      })}
    </ul>
  </nav>
);

const Brand = ({ collapsed = false }: { collapsed?: boolean }) => (
  <div className='flex items-center gap-2.5 whitespace-nowrap text-primary'>
    <Feather aria-hidden='true' className='shrink-0' size={28} strokeWidth={1.8} />
    <span className='sidebar-label font-display text-3xl font-semibold tracking-tight' data-collapsed={collapsed}>
      Hermes
    </span>
  </div>
);

const LogoutAction = ({ collapsed = false, onError }: { collapsed?: boolean; onError?: () => void }) => {
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const { tooltip, triggerProps, triggerRef } = useTooltip<HTMLButtonElement>({
    content: 'Keluar',
    enabled: collapsed,
  });

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
        className='sidebar-nav-row rounded-control text-sm font-medium text-ink hover:bg-surface-subtle'
        aria-label={collapsed ? 'Keluar' : undefined}
        aria-busy={pending || undefined}
        disabled={pending}
        onClick={() => void handleLogout()}
        ref={triggerRef}
        {...triggerProps}
      >
        <LogOut aria-hidden='true' size={21} strokeWidth={1.8} />
        <NavigationLabel collapsed={collapsed} label={pending ? 'Mengeluarkan…' : 'Keluar'} />
      </button>
      {tooltip}
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
  const { tooltip, triggerProps, triggerRef } = useTooltip<HTMLButtonElement>({
    content: expanded ? 'Ciutkan sidebar' : 'Buka sidebar',
    enabled: true,
  });

  // Collapsed, the button is invisible until the brand row is hovered, so the row itself starts the tooltip.
  const brandHoverProps = expanded
    ? {}
    : { onPointerEnter: triggerProps.onPointerEnter, onPointerLeave: triggerProps.onPointerLeave };

  return (
    <aside
      className={classNames(
        'fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface',
        'app-sidebar lg:block',
        expanded ? 'w-(--sidebar-width)' : 'w-(--sidebar-collapsed-width)',
      )}
      data-expanded={expanded}
    >
      <div className='flex h-full flex-col overflow-hidden px-4 pb-4 pt-7'>
        {/* The button lives in the brand row so hovering the revealed button still counts as hovering the brand. */}
        <div className='sidebar-brand' {...brandHoverProps}>
          <Brand collapsed={!expanded} />
          <button
            type='button'
            className='sidebar-toggle grid size-10 place-items-center rounded-control border border-border bg-surface text-ink shadow-sm hover:border-border-strong hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
            aria-expanded={expanded}
            aria-label={expanded ? 'Ciutkan sidebar' : 'Buka sidebar'}
            onClick={() => onExpandedChange(!expanded)}
            ref={triggerRef}
            {...triggerProps}
          >
            <PanelLeft aria-hidden='true' size={24} strokeWidth={1.8} />
          </button>
          {tooltip}
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
