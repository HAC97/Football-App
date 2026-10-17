// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import summary from '../__fixtures__/summary-laliga.json';
import { makeMatch, team } from '../__fixtures__/factory';
import { leagueById } from '../config/leagues';
import { MatchModal } from './MatchModal';

const api = vi.hoisted(() => ({ fetchSummary: vi.fn() }));
vi.mock('../services/espn', () => api);

// Real ESPN payload for Valencia vs Real Sociedad: has goals, lineups and stats.
const match = makeMatch({
  status: 'FINISHED',
  statusName: 'STATUS_FULL_TIME',
  statusDetail: 'FT',
  score: { home: 2, away: 1 },
  homeTeam: team('94', 'Valencia'),
  awayTeam: team('89', 'Real Sociedad'),
});
const league = leagueById('ll')!;

const renderModal = (onClose = vi.fn()) => render(<MatchModal match={match} league={league} now={0} onClose={onClose} />);

beforeEach(() => {
  api.fetchSummary.mockReset();
  api.fetchSummary.mockResolvedValue(summary);
});

describe('MatchModal', () => {
  it('opens as a modal dialog named after the match', async () => {
    renderModal();
    const dialog = await screen.findByRole('dialog');
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');
  });

  it('shows a loading state, then the tabs the summary supports', async () => {
    renderModal();
    expect(screen.getByLabelText('Cargando detalle')).toBeTruthy();
    expect(await screen.findByRole('tab', { name: 'Resumen' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Alineaciones' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Estadísticas' })).toBeTruthy();
    expect(screen.queryByLabelText('Cargando detalle')).toBeNull();
  });

  it('moves between tabs with the arrow keys, wrapping at both ends (WAI-ARIA tabs)', async () => {
    const user = userEvent.setup();
    renderModal();
    const summaryTab = await screen.findByRole('tab', { name: 'Resumen' });
    expect(summaryTab.getAttribute('aria-selected')).toBe('true');
    expect(summaryTab.tabIndex).toBe(0);

    summaryTab.focus();
    await user.keyboard('{ArrowRight}');
    const lineups = screen.getByRole('tab', { name: 'Alineaciones' });
    expect(lineups.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(lineups);
    expect(summaryTab.tabIndex).toBe(-1);

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Estadísticas' }).getAttribute('aria-selected')).toBe('true');

    await user.keyboard('{ArrowRight}');
    expect(summaryTab.getAttribute('aria-selected')).toBe('true');

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Estadísticas' }).getAttribute('aria-selected')).toBe('true');
  });

  it('shows the selected tab panel, labelled by its tab', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(await screen.findByRole('tab', { name: 'Estadísticas' }));
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe('tab-estadisticas');
    expect(panel.textContent).toContain('Posesión');
  });

  it('shows an error with a working retry when the summary fails', async () => {
    const user = userEvent.setup();
    api.fetchSummary.mockRejectedValueOnce(new Error('boom'));
    renderModal();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('No pudimos cargar el detalle del partido.');

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('tab', { name: 'Resumen' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(api.fetchSummary).toHaveBeenCalledTimes(2);
  });

  it('says there is no data when the summary has nothing to show', async () => {
    api.fetchSummary.mockResolvedValue({});
    renderModal();
    expect(await screen.findByText('Todavía no hay datos de este partido.')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('calls onClose from the close button and from a click on the backdrop', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = renderModal(onClose);
    await user.click(await screen.findByRole('button', { name: 'Cerrar detalle' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();

    const again = vi.fn();
    renderModal(again);
    // The dialog element itself is the backdrop; clicks inside the panel must not close it.
    await user.click(await screen.findByRole('tablist'));
    expect(again).not.toHaveBeenCalled();
    await user.click(screen.getByRole('dialog'));
    expect(again).toHaveBeenCalledTimes(1);
  });
});
