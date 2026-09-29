import type { Match, Team } from '../types';

export const team = (id: string, name = id): Team => ({ id, name, shortName: name.slice(0, 3).toUpperCase(), logo: '' });

export function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: '1',
    leagueId: 'll',
    espnSlug: 'esp.1',
    homeTeam: team('h', 'Home'),
    awayTeam: team('a', 'Away'),
    date: '2026-09-28T19:00:00Z',
    status: 'SCHEDULED',
    statusName: 'STATUS_SCHEDULED',
    statusDetail: '',
    ...overrides,
  };
}
