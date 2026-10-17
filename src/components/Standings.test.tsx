// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { team } from '../__fixtures__/factory';
import { leagues } from '../config/leagues';
import type { StandingTeam, StandingsGroup } from '../types';
import { Standings } from './Standings';

const api = vi.hoisted(() => ({ fetchStandings: vi.fn() }));
vi.mock('../services/espn', () => api);

const entry = (rank: number, name: string, points: number, goalDifference: number, zone?: StandingTeam['zone']): StandingTeam => ({
  id: name,
  rank,
  team: team(name),
  played: 10,
  points,
  goalDifference,
  zone,
});

const table: StandingsGroup[] = [
  {
    name: 'Tabla general',
    entries: [
      entry(1, 'Leader', 25, 12, { color: '#00f', description: 'Clasifica a Champions League' }),
      entry(2, 'Middle', 18, 0),
      entry(3, 'Bottom', 4, -9, { color: '#f00', description: 'Descenso' }),
    ],
  },
];

const renderStandings = (leagueId = 'll', onPick = vi.fn()) => render(<Standings leagues={leagues} meta={{}} leagueId={leagueId} onPick={onPick} />);

beforeEach(() => {
  api.fetchStandings.mockReset();
  api.fetchStandings.mockResolvedValue(table);
});

describe('Standings', () => {
  it('shows a loading state, then the table with rank, played, goal difference and points', async () => {
    renderStandings();
    expect(screen.getByLabelText('Cargando posiciones')).toBeTruthy();

    const rows = within(await screen.findByRole('table', { name: 'LaLiga: Tabla general' })).getAllByRole('row');
    expect(rows).toHaveLength(4); // header + 3 teams
    expect(screen.queryByLabelText('Cargando posiciones')).toBeNull();
    const cells = within(rows[1]).getAllByRole('cell');
    expect(within(cells[1]).getByTitle('Leader')).toBeTruthy();
    expect([cells[0], cells[2], cells[3], cells[4]].map((c) => c.textContent)).toEqual(['1', '10', '+12', '25']);
  });

  it('signs the goal difference: + for positive, plain 0, - for negative', async () => {
    renderStandings();
    const rows = within(await screen.findByRole('table')).getAllByRole('row');
    const gd = (i: number) => within(rows[i]).getAllByRole('cell')[3].textContent;
    expect([gd(1), gd(2), gd(3)]).toEqual(['+12', '0', '-9']);
  });

  it('lists each qualification zone once in the legend', async () => {
    renderStandings();
    const legend = await screen.findByRole('list', { name: 'Referencias de la tabla' });
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Clasifica a Champions League', 'Descenso']);
  });

  it('titles each group when the competition has several', async () => {
    api.fetchStandings.mockResolvedValue([
      { name: 'Grupo A', entries: [entry(1, 'Alpha', 6, 3)] },
      { name: 'Grupo B', entries: [entry(1, 'Beta', 6, 2)] },
    ]);
    renderStandings('ucl');
    expect(await screen.findByRole('heading', { name: 'Grupo A' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Grupo B' })).toBeTruthy();
    expect(screen.getAllByRole('table')).toHaveLength(2);
  });

  it('says so when the competition has no table', async () => {
    api.fetchStandings.mockResolvedValue([]);
    renderStandings('lib');
    expect(await screen.findByText('Esta competencia no tiene tabla de posiciones.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows an error with a working retry', async () => {
    const user = userEvent.setup();
    api.fetchStandings.mockRejectedValueOnce(new Error('boom'));
    renderStandings();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('No pudimos cargar la tabla.');

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(api.fetchStandings).toHaveBeenCalledTimes(2);
  });

  it('reports the picked league through the selector', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    renderStandings('ll', onPick);
    await screen.findByRole('table');

    await user.selectOptions(screen.getByRole('combobox', { name: /Liga de la tabla/ }), 'pl');
    expect(onPick).toHaveBeenCalledWith('pl');
  });

  it('loads the table of the new league and never lets a slow answer for the old one overwrite it', async () => {
    let resolveFirst!: (v: StandingsGroup[]) => void;
    api.fetchStandings.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)));
    api.fetchStandings.mockResolvedValueOnce([{ name: 'Tabla general', entries: [entry(1, 'Arsenal', 30, 20)] }]);

    const { rerender } = renderStandings('ll');
    rerender(<Standings leagues={leagues} meta={{}} leagueId="pl" onPick={vi.fn()} />);
    expect(await screen.findByText('Arsenal')).toBeTruthy();

    await act(async () => resolveFirst([{ name: 'Tabla general', entries: [entry(1, 'Madrid', 99, 50)] }]));
    expect(screen.getByText('Arsenal')).toBeTruthy();
    expect(screen.queryByText('Madrid')).toBeNull();
  });
});
