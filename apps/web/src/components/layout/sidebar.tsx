import { Feather, LogOut, PanelLeft } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../app/auth/auth-context';
import { classNames } from '../../lib/class-names';
import { confirmDiscardChanges } from '../../lib/hooks/use-unsaved-changes';
import { useTooltip } from '../ui/tooltip';
import { Navigation, NavigationLabel } from './navigation';

export const Brand = ({ collapsed = false }: { collapsed?: boolean }) => (
  <div className='flex items-center gap-2.5 whitespace-nowrap text-primary'>
    <Feather aria-hidden='true' className='shrink-0' size={28} strokeWidth={1.8} />
    <span className='sidebar-label font-display text-3xl font-semibold tracking-tight' data-collapsed={collapsed}>
      Hermes
    </span>
  </div>
);

export const LogoutAction = ({ collapsed = false, onError }: { collapsed?: boolean; onError?: () => void }) => {
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

export const DesktopSidebar = ({ expanded, onExpandedChange }: DesktopSidebarProps) => {
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
