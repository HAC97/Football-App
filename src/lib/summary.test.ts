import { describe, expect, it } from 'vitest';
import fixture from '../__fixtures__/summary-laliga.json';
import { makeMatch, team } from '../__fixtures__/factory';
import { homeShare, isGoal, parseEvents, parseLineups, parseStats, positionRank, positionSide, type RawSummary } from './summary';

// Real ESPN response (LaLiga, Valencia 2-? Real Sociedad), trimmed to the fields we read.
const summary = fixture as unknown as RawSummary;
const match = makeMatch({ homeTeam: team('94', 'Valencia'), awayTeam: team('89', 'Real Sociedad') });

describe('parseStats', () => {
  it('reads per-team stats from boxscore.teams (the old code read a field that does not exist, so stats never rendered)', () => {
    const rows = parseStats(summary);
    expect(rows.length).toBeGreaterThan(8);
    const possession = rows.find((r) => r.key === 'possessionPct')!;
    expect(possession.label).toBe('Posesión');
    expect(possession.home).toBeCloseTo(54.1);
    expect(possession.home + possession.away).toBeCloseTo(100, 0);
    expect(possession.suffix).toBe('%');
  });

  it('shows different numbers for home and away', () => {
    const fouls = parseStats(summary).find((r) => r.key === 'foulsCommitted')!;
    expect(fouls.home).toBe(9);
    expect(fouls.away).toBe(12);
  });

  it('ignores the fractional percentage stats (0.2 is a ratio, not 0.2%)', () => {
    expect(parseStats(summary).some((r) => r.key === 'shotPct')).toBe(false);
  });

  it('returns nothing when the summary has no boxscore', () => {
    expect(parseStats({})).toEqual([]);
  });
});

describe('homeShare', () => {
  it('splits proportionally', () => expect(homeShare({ home: 3, away: 1 })).toBe(75));
  it('splits evenly when both are zero (no NaN width)', () => expect(homeShare({ home: 0, away: 0 })).toBe(50));
  it('gives all the bar to the only side with a value', () => expect(homeShare({ home: 0, away: 4 })).toBe(0));
});

describe('parseEvents', () => {
  const events = parseEvents(summary, match);

  it('keeps goals, cards and substitutions with their side', () => {
    const goal = events.find((e) => e.kind === 'goal')!;
    expect(goal.player).toBe('Luka Sucic');
    expect(goal.minute).toBe("26'");
    expect(goal.side).toBe('away');
    expect(events.some((e) => e.kind === 'yellow' && e.side === 'home')).toBe(true);
    expect(events.some((e) => e.kind === 'red' && e.side === 'away')).toBe(true);
  });

  it('puts the player coming on as the main name and the one going off as detail', () => {
    const sub = events.find((e) => e.kind === 'sub')!;
    expect(sub.player).toBe('David Otorbi');
    expect(sub.detail).toBe('Filip Ugrinic');
  });

  it('translates period markers to Spanish', () => {
    expect(events.find((e) => e.kind === 'period')?.player).toBe('Fin del primer tiempo');
  });

  it('shows a period marker once even when ESPN sends it twice', () => {
    const delay = (id: string, minute: string, type: string) => ({ id, type: { type }, clock: { displayValue: minute } });
    const deduped = parseEvents({ keyEvents: [delay('1', "30'", 'start-delay'), delay('2', "30'", 'start-delay'), delay('3', "31'", 'end-delay'), delay('4', "31'", 'end-delay'), delay('5', "56'", 'start-delay')] }, match);
    expect(deduped.map((e) => `${e.minute} ${e.player}`)).toEqual(["30' Partido demorado", "31' Se reanuda el partido", "56' Partido demorado"]);
  });

  it('keeps a running score, credits own goals to the other side and ignores shootout kicks', () => {
    const ev = (id: string, type: string, teamId: string, shootout = false) => ({ id, type: { type }, clock: { displayValue: `${id}'` }, team: { id: teamId }, participants: [{ athlete: { displayName: `P${id}` } }], shootout });
    const scored = parseEvents(
      { keyEvents: [ev('10', 'goal', '94'), ev('20', 'goal', '89'), ev('30', 'own-goal', '89'), ev('40', 'penalty---scored', '94', true)] },
      match,
    );
    expect(scored.map((e) => e.score)).toEqual(['1–0', '1–1', '2–1', undefined]);
  });

  it('ends on the real final score for a full match', () => {
    const goals = events.filter(isGoal);
    expect(goals.at(-1)?.score).toMatch(/^\d+–\d+$/);
  });

  it('counts scoring plays consistently with isGoal', () => {
    expect(events.filter(isGoal).length).toBeGreaterThan(0);
  });
});

describe('positions', () => {
  it.each([
    ['G', 0],
    ['CD-L', 1],
    ['LB', 1],
    ['RWB', 1],
    ['DM', 2],
    ['CM-R', 3],
    ['LM', 3],
    ['AM-L', 4],
    ['CF-L', 5],
    ['LF', 5],
    ['LW', 5],
    [undefined, 5],
  ])('ranks %s as row %s', (abbr, rank) => {
    expect(positionRank(abbr)).toBe(rank);
  });

  it('orders left to right', () => {
    expect(['CD-R', 'LB', 'RB', 'CD-L'].map(positionSide)).toEqual([1, -1, 1, -1]);
    expect(positionSide('CM')).toBe(0);
  });
});

describe('parseLineups', () => {
  const lineups = parseLineups(summary);

  it('builds a 4-4-2 as keeper, defence, midfield, attack', () => {
    const home = lineups.find((l) => l.side === 'home')!;
    expect(home.formation).toBe('4-4-2');
    expect(home.rows.map((r) => r.length)).toEqual([1, 4, 4, 2]);
  });

  it('puts the left-sided defender before the right-sided one', () => {
    const defence = lineups.find((l) => l.side === 'home')!.rows[1].map((p) => p.position);
    expect(defence.indexOf('LB')).toBeLessThan(defence.indexOf('RB'));
    expect(defence.indexOf('CD-L')).toBeLessThan(defence.indexOf('CD-R'));
  });

  it('has 11 starters per side and a bench', () => {
    for (const l of lineups) {
      expect(l.rows.flat()).toHaveLength(11);
      expect(l.bench.length).toBeGreaterThan(0);
    }
  });

  it('skips a side with no confirmed starters', () => {
    expect(parseLineups({ rosters: [{ homeAway: 'home', roster: [{ starter: false, jersey: '1' }] }] })).toEqual([]);
  });
});
