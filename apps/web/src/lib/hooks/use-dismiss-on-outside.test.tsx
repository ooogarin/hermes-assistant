import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { useDismissOnOutside } from './use-dismiss-on-outside';

const Layer = ({
  dismissOnFocusOut = false,
  onDismiss,
  restoreFocus = false,
}: {
  dismissOnFocusOut?: boolean;
  onDismiss: () => void;
  restoreFocus?: boolean;
}) => {
  const { containerRef, triggerRef } = useDismissOnOutside<HTMLDivElement, HTMLButtonElement>({
    active: true,
    dismissOnFocusOut,
    onDismiss,
    restoreFocus,
  });

  return (
    <div>
      <button ref={triggerRef} type='button'>
        Pemicu
      </button>
      <div ref={containerRef}>
        <button type='button'>Di dalam</button>
      </div>
      <button type='button'>Di luar</button>
    </div>
  );
};

describe('useDismissOnOutside', () => {
  test('dismisses on a pointer down outside the layer', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Layer onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: 'Di luar' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('keeps the layer open for a pointer down inside it', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Layer onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: 'Di dalam' }));

    expect(onDismiss).not.toHaveBeenCalled();
  });

  test('dismisses once on Escape inside the layer', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Layer onDismiss={onDismiss} />);

    screen.getByRole('button', { name: 'Di dalam' }).focus();
    await user.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('dismisses on Escape when the focus already left the layer', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Layer onDismiss={onDismiss} />);

    screen.getByRole('button', { name: 'Di luar' }).focus();
    await user.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('returns the focus to the trigger when asked', async () => {
    const user = userEvent.setup();
    render(<Layer onDismiss={vi.fn()} restoreFocus />);

    screen.getByRole('button', { name: 'Di dalam' }).focus();
    await user.keyboard('{Escape}');

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pemicu' }));
  });

  test('keeps the layer open when the focus moves inside it', () => {
    const onDismiss = vi.fn();
    render(<Layer dismissOnFocusOut onDismiss={onDismiss} />);

    screen.getByRole('button', { name: 'Di dalam' }).focus();

    expect(onDismiss).not.toHaveBeenCalled();
  });

  test('dismisses when the focus moves out of the layer', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Layer dismissOnFocusOut onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: 'Di luar' }));

    expect(onDismiss).toHaveBeenCalled();
  });
});
