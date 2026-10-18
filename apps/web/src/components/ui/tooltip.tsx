import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PointerEvent, ReactNode, RefObject } from 'react';

const openDelay = 500;
const skipDelayWindow = 300;
const pointerFocusWindow = 500;
const tooltipGap = 10;

// Shared between triggers so moving along the rail skips the open delay.
let lastClosedAt = 0;

type TooltipOptions = {
  content: string;
  enabled: boolean;
};

type TooltipTriggerProps = {
  onBlur: () => void;
  onFocus: () => void;
  onPointerDown: () => void;
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
};

type TooltipResult<T extends HTMLElement> = {
  tooltip: ReactNode;
  triggerProps: TooltipTriggerProps;
  triggerRef: RefObject<T | null>;
};

export const useTooltip = <T extends HTMLElement>({ content, enabled }: TooltipOptions): TooltipResult<T> => {
  const triggerRef = useRef<T>(null);
  const openTimeoutRef = useRef<number | undefined>(undefined);
  const lastPointerDownRef = useRef(0);
  const isOpenRef = useRef(false);
  const [position, setPosition] = useState<{ left: number; top: number }>();

  const close = useCallback(() => {
    window.clearTimeout(openTimeoutRef.current);
    openTimeoutRef.current = undefined;

    if (!isOpenRef.current) {
      return;
    }

    isOpenRef.current = false;
    lastClosedAt = Date.now();
    setPosition(undefined);
  }, []);

  const open = useCallback(() => {
    const trigger = triggerRef.current;

    if (trigger === null) {
      return;
    }

    const bounds = trigger.getBoundingClientRect();

    isOpenRef.current = true;
    setPosition({ left: bounds.right + tooltipGap, top: bounds.top + bounds.height / 2 });
  }, []);

  const requestOpen = useCallback(
    (immediate: boolean) => {
      if (!enabled || content.length === 0 || isOpenRef.current) {
        return;
      }

      window.clearTimeout(openTimeoutRef.current);

      const recentlyClosed = Date.now() - lastClosedAt < skipDelayWindow;

      if (immediate || recentlyClosed) {
        open();
        return;
      }

      openTimeoutRef.current = window.setTimeout(open, openDelay);
    },
    [content, enabled, open],
  );

  useEffect(() => {
    if (!enabled) {
      close();
    }
  }, [close, enabled]);

  useEffect(() => () => window.clearTimeout(openTimeoutRef.current), []);

  useEffect(() => {
    if (position === undefined) {
      return;
    }

    const handlePointerDown = () => close();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        close();
      }
    };
    const handleViewportChange = () => close();

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [close, position]);

  const triggerProps: TooltipTriggerProps = {
    onBlur: close,
    onFocus: () => {
      // A click also focuses its trigger; only keyboard focus should reveal the label.
      if (Date.now() - lastPointerDownRef.current > pointerFocusWindow) {
        requestOpen(true);
      }
    },
    onPointerDown: () => {
      lastPointerDownRef.current = Date.now();
      close();
    },
    onPointerEnter: (event) => {
      if (event.pointerType !== 'touch') {
        requestOpen(false);
      }
    },
    onPointerLeave: close,
  };

  // The trigger already carries an aria-label, so the tooltip stays visual only.
  const tooltip =
    position === undefined
      ? null
      : createPortal(
          <div aria-hidden='true' className='sidebar-tooltip' style={{ left: position.left, top: position.top }}>
            {content}
          </div>,
          document.body,
        );

  return { tooltip, triggerProps, triggerRef };
};
