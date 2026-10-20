import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { navigationItems } from '../../app/navigation';
import { classNames } from '../../lib/class-names';
import { useTooltip } from '../ui/tooltip';
import type { NavigationChild, NavigationItem } from '../../app/navigation';

type NavigationProps = {
  collapsed?: boolean;
  onExpand?: () => void;
  onNavigate?: () => void;
};

export const NavigationLabel = ({ collapsed, label }: { collapsed: boolean; label: string }) => (
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

export const Navigation = ({ collapsed = false, onExpand, onNavigate }: NavigationProps) => (
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
