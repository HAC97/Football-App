// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import summary from './__fixtures__/summary-laliga.json';
import { makeMatch, team } from './__fixtures__/factory';
import { CACHE_KEY, serializeCache } from './lib/cache';
import { leagues } from './config/leagues';
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
  window.history.replaceState(null, '', '/');
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

describe('App: address', () => {
  const go = (url: string) => window.history.replaceState(null, '', url);
  const here = () => window.location.pathname + window.location.search;
  const settle = () => act(async () => new Promise((r) => setTimeout(r, 20)));

  it('opens the view the address describes', async () => {
    go('/?liga=pl&estado=finalizados');
    render(<App />);
    expect(await screen.findByRole('button', { name: rowName('Chelsea', 'Tottenham') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeNull();
    expect(within(screen.getByRole('group', { name: 'Filtrar por estado' })).getByRole('button', { name: /Finalizados/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('lists Copa Sudamericana in the nav, groups its matches under it and filters by ?liga=sud', async () => {
    const sud = makeMatch({ id: 'sud1', leagueId: 'sud', espnSlug: 'conmebol.sudamericana', date: at(0, 20), homeTeam: team('b', 'Boca'), awayTeam: team('v', 'Vasco') });
    api.fetchWindow.mockResolvedValue(loaded([scheduled, sud]));
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Copa Sudamericana' })).toBeTruthy();
    expect(screen.getByRole('button', { name: rowName('Boca', 'Vasco') })).toBeTruthy();

    await user.click(within(screen.getByRole('navigation', { name: 'Ligas' })).getByRole('button', { name: /Copa Sudamericana/ }));
    expect(here()).toBe('/?liga=sud');
    expect(screen.queryByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeNull();
    expect(screen.getByRole('button', { name: rowName('Boca', 'Vasco') })).toBeTruthy();
  });

  it('opens straight on Copa Sudamericana from the address', async () => {
    go('/?liga=sud');
    api.fetchWindow.mockResolvedValue(loaded([scheduled, makeMatch({ id: 'sud1', leagueId: 'sud', date: at(0, 20), homeTeam: team('b', 'Boca'), awayTeam: team('v', 'Vasco') })]));
    render(<App />);
    expect(await screen.findByRole('button', { name: rowName('Boca', 'Vasco') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeNull();
  });

  it('opens on the day in the address', async () => {
    go('/?dia=2026-10-18');
    render(<App />);
    expect(await screen.findByRole('button', { name: rowName('Getafe', 'Osasuna') })).toBeTruthy();
  });

  it('ignores a day outside the strip and shows the default day', async () => {
    go('/?dia=2026-01-01');
    render(<App />);
    expect(await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeTruthy();
  });

  it('writes league, day and status into the address as they change, without piling up history', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') });
    const entries = window.history.length;

    await user.click(within(screen.getByRole('navigation', { name: 'Ligas' })).getByRole('button', { name: /Premier League/ }));
    await user.click(screen.getByRole('button', { name: /18 de octubre/ }));
    await user.click(within(screen.getByRole('group', { name: 'Filtrar por estado' })).getByRole('button', { name: /Próximos/ }));

    expect(here()).toBe('/?liga=pl&dia=2026-10-18&estado=proximos');
    expect(window.history.length).toBe(entries);
  });

  it('uses the league remembered on this device and shows it in the address', async () => {
    localStorage.setItem('fulltime-league', 'pl');
    render(<App />);
    expect(await screen.findByRole('button', { name: rowName('Chelsea', 'Tottenham') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeNull();
    expect(here()).toBe('/?liga=pl');
  });

  it('lets the address win over the remembered league', async () => {
    localStorage.setItem('fulltime-league', 'pl');
    go('/?liga=ll');
    render(<App />);
    expect(await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: rowName('Chelsea', 'Tottenham') })).toBeNull();
  });

  it('opening a match adds a history entry and Back closes it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') }));
    await screen.findByRole('dialog');
    expect(here()).toBe('/?partido=s');

    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(here()).toBe('/');
  });

  it('closing with the X steps Back too, so the address is clean afterwards', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cerrar detalle' }));
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(here()).toBe('/');
  });

  it('opens the detail of a shared link once the matches load, and closing it cleans the address', async () => {
    const user = userEvent.setup();
    go('/?partido=s');
    render(<App />);
    const dialog = await screen.findByRole('dialog');
    expect(api.fetchSummary).toHaveBeenCalledWith(expect.objectContaining({ id: 's' }), expect.any(AbortSignal));

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar detalle' }));
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(here()).toBe('/');
  });

  it('drops a link to a match that does not exist, once ESPN has answered', async () => {
    go('/?partido=nope');
    render(<App />);
    await screen.findByRole('button', { name: rowName('Valencia', 'Sociedad') });
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(here()).toBe('/');
  });

  it('does not drop a shared match just because the cached list lacks it: it waits for ESPN', async () => {
    go('/?partido=n');
    localStorage.setItem(CACHE_KEY, serializeCache([scheduled], {}, Date.now() - 60_000));
    let resolve!: (v: ReturnType<typeof loaded>) => void;
    api.fetchWindow.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<App />);
    await settle();
    expect(here()).toBe('/?partido=n');

    await act(async () => resolve(loaded([scheduled, tomorrow])));
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('keeps a shared match when every league is down (nothing confirms it is gone)', async () => {
    go('/?partido=n');
    api.fetchWindow.mockResolvedValue(loaded([], leagues.map((l) => l.id)));
    render(<App />);
    await screen.findByRole('heading', { name: 'No pudimos cargar los partidos' });
    await settle();
    expect(here()).toBe('/?partido=n');
  });
});

describe('App: cached first paint', () => {
  it('shows the last visit right away while the network is still pending, then the fresh data', async () => {
    localStorage.setItem(CACHE_KEY, serializeCache([scheduled], {}, Date.now() - 5 * 60_000));
    let resolve!: (v: ReturnType<typeof loaded>) => void;
    api.fetchWindow.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<App />);

    expect(screen.getByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeTruthy();
    expect(screen.queryByLabelText('Cargando partidos')).toBeNull();

    await act(async () => resolve(loaded([tomorrow, scheduled])));
    expect(screen.getByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeTruthy();
  });

  it('keeps the cached list and offers a retry when the network is down', async () => {
    localStorage.setItem(CACHE_KEY, serializeCache([scheduled], {}, Date.now() - 5 * 60_000));
    api.fetchWindow.mockResolvedValue(loaded([], leagues.map((l) => l.id)));
    render(<App />);

    expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: rowName('Valencia', 'Sociedad') })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'No pudimos cargar los partidos' })).toBeNull();
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
