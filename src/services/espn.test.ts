import { describe, expect, it } from 'vitest';
import event from '../__fixtures__/event-finished.json';
import { leagueById } from '../config/leagues';
import { normalizeEvent, normalizeStandings, translateGroupName, translateZone, type RawEvent } from './espn';

const league = leagueById('ll')!;
const raw = event as unknown as RawEvent;
const withState = (state: 'pre' | 'in' | 'post', extra: Partial<RawEvent['status']> = {}, name = ''): RawEvent => ({
  ...raw,
  status: { ...raw.status, ...extra, type: { ...raw.status.type, state, name } },
});

describe('normalizeEvent', () => {
  it('maps a finished match (real ESPN payload)', () => {
    const m = normalizeEvent(raw, league, 123)!;
    expect(m.status).toBe('FINISHED');
    expect(m.homeTeam.name).toBe('Valencia');
    expect(m.awayTeam.name).toBe('Real Sociedad');
    expect(m.score).toEqual({ home: 2, away: 3 });
    expect(m.leagueId).toBe('ll');
    expect(m.espnSlug).toBe('esp.1');
    expect(m.venue).toBeTruthy();
    expect(m.fetchedAt).toBeUndefined();
    expect(m.clockSeconds).toBeUndefined();
  });

  it('keeps the live clock and the poll time only for live matches', () => {
    const m = normalizeEvent(withState('in', { clock: 1509, displayClock: "26'", period: 1 }, 'STATUS_FIRST_HALF'), league, 555)!;
    expect(m.status).toBe('LIVE');
    expect(m.clockSeconds).toBe(1509);
    expect(m.displayClock).toBe("26'");
    expect(m.period).toBe(1);
    expect(m.fetchedAt).toBe(555);
  });

  it('has no score before kickoff', () => {
    expect(normalizeEvent(withState('pre'), league)!.score).toBeUndefined();
  });

  it('reads the penalty shootout from shootoutScore', () => {
    const shootout: RawEvent = {
      ...raw,
      competitions: [{ ...raw.competitions[0], competitors: raw.competitions[0].competitors.map((c) => ({ ...c, shootoutScore: c.homeAway === 'home' ? 4 : 3 })) }],
    };
    expect(normalizeEvent(shootout, league)!.penalties).toEqual({ home: 4, away: 3 });
  });

  it('returns null instead of crashing on an event without both teams', () => {
    const broken = { ...raw, competitions: [{ competitors: [raw.competitions[0].competitors[0]] }] } as RawEvent;
    expect(normalizeEvent(broken, league)).toBeNull();
  });

  it('does not depend on a placeholder image host when a crest is missing', () => {
    const noLogo: RawEvent = {
      ...raw,
      competitions: [{ ...raw.competitions[0], competitors: raw.competitions[0].competitors.map((c) => ({ ...c, team: { ...c.team, logo: undefined } })) }],
    };
    expect(normalizeEvent(noLogo, league)!.homeTeam.logo).toBe('');
  });
});

describe('normalizeStandings', () => {
  const stat = (name: string, value: number) => ({ name, value });
  const entry = (rank: number, name: string, note?: { color: string; description: string }) => ({
    team: { id: String(rank), displayName: name, abbreviation: name.slice(0, 3).toUpperCase(), logos: [{ href: `${name}.png` }] },
    note,
    stats: [stat('rank', rank), stat('points', 30 - rank), stat('gamesPlayed', 10), stat('wins', 5), stat('ties', 1), stat('losses', 4), stat('pointsFor', 12), stat('pointsAgainst', 8), stat('pointDifferential', 4)],
  });

  it('sorts by rank, reads every column and keeps the qualification zone', () => {
    const [group] = normalizeStandings({
      children: [{ name: 'LALIGA', standings: { entries: [entry(2, 'Bravo'), entry(1, 'Alfa', { color: '#81D6AC', description: 'Champions League' })] } }],
    });
    expect(group.name).toBe('LALIGA');
    expect(group.entries.map((e) => e.team.name)).toEqual(['Alfa', 'Bravo']);
    expect(group.entries[0]).toMatchObject({ points: 29, played: 10, wins: 5, draws: 1, losses: 4, goalsFor: 12, goalsAgainst: 8, goalDifference: 4 });
    expect(group.entries[0].zone).toEqual({ color: '#81D6AC', description: 'Champions League' });
    expect(group.entries[1].zone).toBeUndefined();
    expect(group.entries[0].team.logo).toBe('Alfa.png');
  });

  it.each([
    ['Relegation', 'Descenso'],
    ['Relegation Playoff', 'Promoción por el descenso'],
    ['Qualifies for Round of 16', 'Clasifica a octavos de final'],
    ['Qualifies for Round of 16 (playoff)', 'Clasifica a octavos de final'],
    ['Qualifies for the Knockout Round Play-offs', 'Clasifica al playoff'],
    ['Qualifies for Europa League', 'Clasifica a Europa League'],
    ['Champions League', 'Champions League'],
    ['Europa League', 'Europa League'],
    ['Something new', 'Something new'],
  ])('translates the zone label %s', (from, to) => {
    expect(translateZone(from)).toBe(to);
  });

  it('translates ESPN group names to Spanish', () => {
    expect(translateGroupName('Group A')).toBe('Grupo A');
    expect(translateGroupName('group h')).toBe('Grupo h');
    expect(translateGroupName('League Phase')).toBe('Fase de liga');
    expect(translateGroupName('2026-27 LALIGA')).toBe('2026-27 LALIGA');
    expect(translateGroupName(undefined)).toBe('Tabla general');
  });

  it('returns no groups for a competition without a table', () => {
    expect(normalizeStandings({})).toEqual([]);
  });
});
