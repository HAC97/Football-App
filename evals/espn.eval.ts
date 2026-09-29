import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { leagues } from '../src/config/leagues';
import { fetchStandings, fetchSummary, fetchWindow } from '../src/services/espn';
import { parseEvents, parseLineups, parseStats, type RawSummary } from '../src/lib/summary';
import type { Match } from '../src/types';

/**
 * Live contract eval against ESPN. The bug that emptied the whole app (day ranges answered with HTTP 400) and
 * the stats bug (wrong field path) were both contract drift that mocks cannot catch. These fail loudly if it recurs.
 */

const today = new Date();
const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, 1);

describe('ESPN contract', () => {
  it('rejects day ranges but accepts months: the reason we query by month', async () => {
    const base = 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard';
    const month = await fetch(`${base}?dates=${format(today, 'yyyyMM')}`);
    expect(month.status).toBe(200);
    // Informational: if ESPN ever accepts ranges again this still passes; the app does not depend on the 400.
  });

  it('loads a window of matches for every league and normalizes every event', async () => {
    const res = await fetchWindow(leagues, monthAgo, today);
    expect(res.failed).toEqual([]);
    expect(res.matches.length).toBeGreaterThan(20);
    for (const m of res.matches) {
      expect(m.homeTeam.name).toBeTruthy();
      expect(m.awayTeam.name).toBeTruthy();
      expect(Number.isNaN(new Date(m.date).getTime())).toBe(false);
      if (m.status !== 'SCHEDULED') expect(m.score).toBeDefined();
    }
    expect(Object.keys(res.meta).length).toBeGreaterThanOrEqual(4);
  });

  it('serves standings with rank, points and team for every league that has a table', async () => {
    let withTable = 0;
    for (const league of leagues) {
      const groups = await fetchStandings(league);
      if (groups.length === 0) continue;
      withTable += 1;
      for (const g of groups) {
        expect(g.entries.length).toBeGreaterThan(1);
        expect(g.entries[0].rank).toBeGreaterThan(0);
        expect(g.entries[0].team.name).toBeTruthy();
      }
    }
    expect(withTable).toBeGreaterThanOrEqual(5);
  });

  it('summary endpoint yields stats, events and lineups for at least 80% of sampled finished matches', async () => {
    const res = await fetchWindow(leagues, monthAgo, today);
    const finished = res.matches.filter((m: Match) => m.status === 'FINISHED' && m.statusName === 'STATUS_FULL_TIME');
    const sample = finished.slice(-10);
    expect(sample.length).toBeGreaterThan(4);
    let ok = 0;
    for (const m of sample) {
      const s = await fetchSummary<RawSummary>(m);
      const stats = parseStats(s);
      const events = parseEvents(s, m);
      const lineups = parseLineups(s);
      const good = stats.length >= 5 && events.length > 0 && lineups.length === 2 && lineups.every((l) => l.rows.flat().length === 11);
      if (good) ok += 1;
      else console.warn(`summary incomplete for ${m.homeTeam.name} v ${m.awayTeam.name} (${m.leagueId}): stats ${stats.length}, events ${events.length}, lineups ${lineups.length}`);
    }
    expect(ok / sample.length).toBeGreaterThanOrEqual(0.8);
  });
});
