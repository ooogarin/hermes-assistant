import { useCallback, useEffect, useRef } from 'react';

type DismissOptions = {
  active: boolean;
  dismissOnFocusOut?: boolean;
  onDismiss: () => void;
  restoreFocus?: boolean;
};

type OpenLayer = {
  container: HTMLElement | null;
  dismiss: () => void;
};

const openLayers: OpenLayer[] = [];

const isNestedInside = (inner: OpenLayer, outer: OpenLayer): boolean => {
  if (inner.container === null || outer.container === null) return false;

  return outer.container.contains(inner.container);
};

/**
 * The innermost open layer that holds the target wins, so a nested layer closes
 * before the layer around it. Without a target the most recent layer wins.
 */
const findTopmostLayer = (target: Node | null): OpenLayer | undefined => {
  if (openLayers.length === 0) return undefined;
  if (target === null) return openLayers[openLayers.length - 1];

  const matching = openLayers.filter((layer) => layer.container?.contains(target));
  if (matching.length === 0) return openLayers[openLayers.length - 1];

  return matching.reduce((topmost, layer) => (isNestedInside(layer, topmost) ? layer : topmost));
};

const dismissTopmostLayer = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;

  const target = event.target instanceof Node ? event.target : null;
  findTopmostLayer(target)?.dismiss();
};

let escapeListenerInstalled = false;

const installEscapeListener = () => {
  if (escapeListenerInstalled) return;

  escapeListenerInstalled = true;
  document.addEventListener('keydown', dismissTopmostLayer);
};

const removeEscapeListener = () => {
  if (openLayers.length > 0) return;

  escapeListenerInstalled = false;
  document.removeEventListener('keydown', dismissTopmostLayer);
};

/**
 * Dismisses an open layer when the user clicks outside it or presses Escape.
 *
 * Escape always reaches the innermost open layer, so a dropdown inside a filter
 * popover closes the dropdown and leaves the popover open.
 */
export const useDismissOnOutside = <Container extends HTMLElement, Trigger extends HTMLElement = Container>({
  active,
  dismissOnFocusOut = false,
  onDismiss,
  restoreFocus = false,
}: DismissOptions) => {
  const containerRef = useRef<Container>(null);
  const triggerRef = useRef<Trigger>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const dismiss = useCallback(() => {
    dismissRef.current();

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, [restoreFocus]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const isOutside = (event: Event) => {
      const target = event.target;
      return target instanceof Node && !containerRef.current?.contains(target);
    };

    const dismissOnPointerDown = (event: PointerEvent) => {
      if (isOutside(event)) dismiss();
    };

    const dismissOnFocusIn = (event: FocusEvent) => {
      if (isOutside(event)) dismiss();
    };

    const layer: OpenLayer = { container: containerRef.current, dismiss };
    openLayers.push(layer);
    installEscapeListener();

    document.addEventListener('pointerdown', dismissOnPointerDown);
    if (dismissOnFocusOut) document.addEventListener('focusin', dismissOnFocusIn);

    return () => {
      const index = openLayers.indexOf(layer);
      if (index >= 0) openLayers.splice(index, 1);

      document.removeEventListener('pointerdown', dismissOnPointerDown);
      if (dismissOnFocusOut) document.removeEventListener('focusin', dismissOnFocusIn);
      removeEscapeListener();
    };
  }, [active, dismiss, dismissOnFocusOut]);

  return { containerRef, triggerRef };
};
