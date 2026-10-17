// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import summary from './__fixtures__/summary-laliga.json';
import { makeMatch, team } from './__fixtures__/factory';
import type { Match } from './types';
import App from './App';

const api = vi.hoisted(() => ({
  fetchWindow: vi.fn(),
  fetchToday: vi.fn(),
  fetchStandings: vi.fn(),
  fetchSummary: vi.fn(),
}));
vi.mock('./services/espn', () => api);

// Local time, so day grouping is the same in any timezone the tests run in.
const at = (dayOffset: number, hour: number) => new Date(2026, 9, 17 + dayOffset, hour).toISOString();

const scheduled = makeMatch({ id: 's', date: at(0, 15), homeTeam: team('94', 'Valencia'), awayTeam: team('89', 'Sociedad') });
const finished = makeMatch({
  id: 'f',
  leagueId: 'pl',
  espnSlug: 'eng.1',
  date: at(0, 10),
  status: 'FINISHED',
  statusName: 'STATUS_FULL_TIME',
  statusDetail: 'FT',
  score: { home: 2, away: 1 },
  homeTeam: team('c', 'Chelsea'),
  awayTeam: team('t', 'Tottenham'),
});
const tomorrow = makeMatch({ id: 'n', date: at(1, 18), homeTeam: team('x', 'Getafe'), awayTeam: team('y', 'Osasuna') });

const loaded = (matches: Match[], failed: string[] = []) => ({ matches, meta: {}, failed });
const rowName = (home: string, away: string) => new RegExp(`^${home} contra ${away}`);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 12));
  localStorage.clear();
  api.fetchWindow.mockResolvedValue(loaded([scheduled, finished, tomorrow]));
  api.fetchToday.mockResolvedValue(loaded([]));
  api.fetchStandings.mockResolvedValue([]);
  api.fetchSummary.mockResolvedValue(summary);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('App: match list', () => {
  it("opens on today and groups that day's matches under their league", async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeTruthy();
    expect(screen.getByRole('button', { name: rowName('Chelsea', 'Tottenham') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: rowName('Getafe', 'Osasuna') })).toBeNull();
    expect(screen.getByRole('heading', { name: 'LaLiga' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Premier League' })).toBeTruthy();
  });

  it('filters by status and shows the per-status counts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') });

    const filters = within(screen.getByRole('group', { name: 'Filtrar por estado' }));
    expect(filters.getByRole('button', { name: /Finalizados/ }).textContent).toContain('1');

    await user.click(filters.getByRole('button', { name: /Finalizados/ }));
    expect(screen.getByRole('button', { name: rowName('Chelsea', 'Tottenham') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeNull();
  });

  it('explains an empty filter instead of showing a blank page', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') });

    await user.click(within(screen.getByRole('group', { name: 'Filtrar por estado' })).getByRole('button', { name: /En vivo/ }));
    expect(screen.getByRole('heading', { name: 'Sin partidos con este filtro' })).toBeTruthy();
  });

  it('switches day from the day strip', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') });

    await user.click(screen.getByRole('button', { name: /18 de octubre/ }));
    expect(screen.getByRole('button', { name: rowName('Getafe', 'Osasuna') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeNull();
  });

  it('filters by league from the side nav and remembers the choice', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') });

    await user.click(within(screen.getByRole('navigation', { name: 'Ligas' })).getByRole('button', { name: /Premier League/ }));
    expect(screen.queryByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeNull();
    expect(screen.getByRole('button', { name: rowName('Chelsea', 'Tottenham') })).toBeTruthy();
    expect(localStorage.getItem('fulltime-league')).toBe('pl');
  });
});

describe('App: data freshness', () => {
  it('shows the age of the data while a match is live, and nothing otherwise', async () => {
    const liveMatch = makeMatch({ id: 'l', status: 'LIVE', statusName: 'STATUS_IN_PROGRESS', date: at(0, 11), score: { home: 0, away: 0 }, homeTeam: team('a', 'Alpha'), awayTeam: team('b', 'Beta') });
    api.fetchWindow.mockResolvedValue(loaded([liveMatch]));
    render(<App />);
    expect(await screen.findByText(/Actualizado hace \d+ s/)).toBeTruthy();
  });

  it('does not show it when nothing is live', async () => {
    render(<App />);
    await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') });
    expect(screen.queryByText(/Actualizado hace/)).toBeNull();
  });
});

describe('App: loading failures', () => {
  it('shows a retry when every league fails, and recovers on retry', async () => {
    const user = userEvent.setup();
    api.fetchWindow.mockRejectedValueOnce(new Error('boom'));
    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('heading', { name: 'No pudimos cargar los partidos' })).toBeTruthy();

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'No pudimos cargar los partidos' })).toBeNull();
  });

  it('keeps what loaded and names the leagues that failed', async () => {
    api.fetchWindow.mockResolvedValue(loaded([scheduled], ['pl', 'sa']));
    render(<App />);

    const notice = await screen.findByRole('status');
    expect(notice.textContent).toContain('Premier League, Serie A');
    expect(screen.getByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeTruthy();
  });
});

describe('App: match detail', () => {
  it('opens the detail dialog from a row and closes it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') }));
    const dialog = await screen.findByRole('dialog');
    expect(api.fetchSummary).toHaveBeenCalledWith(expect.objectContaining({ id: 's' }), expect.any(AbortSignal));

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
