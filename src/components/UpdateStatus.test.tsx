// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UpdateStatus } from './UpdateStatus';

const T0 = 1_000_000;
const renderStatus = (over: Partial<Parameters<typeof UpdateStatus>[0]> = {}) =>
  render(<UpdateStatus lastUpdated={T0} failures={0} live={true} now={T0 + 12_000} {...over} />);

describe('UpdateStatus', () => {
  it('shows how old the data is while a match is live', () => {
    renderStatus();
    expect(screen.getByText('Actualizado hace 12 s')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows nothing when healthy and nothing is live', () => {
    const { container } = renderStatus({ live: false });
    expect(container.textContent).toBe('');
  });

  it('keeps the quiet line after a single missed poll (a blip is not worth a warning)', () => {
    renderStatus({ failures: 1 });
    expect(screen.getByText('Actualizado hace 12 s')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('warns that the data is stale from the second missed poll, with its age', () => {
    renderStatus({ failures: 2, now: T0 + 130_000 });
    expect(screen.getByRole('status').textContent).toContain('No se pudo actualizar. Los datos son de hace 2 min.');
    expect(screen.queryByText(/Actualizado hace/)).toBeNull();
  });

  it('warns even when no match is live, as long as the polls keep failing', () => {
    renderStatus({ failures: 3, live: false });
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
