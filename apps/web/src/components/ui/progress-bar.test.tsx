import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ProgressBar } from './progress-bar';

describe('ProgressBar', () => {
  test('exposes its label and bounded value to assistive technology', () => {
    render(<ProgressBar label='Proporsi Perumahan' value={125} />);

    expect(screen.getByRole('progressbar', { name: 'Proporsi Perumahan' })).toHaveAttribute('aria-valuenow', '100');
  });
});
