import { describe, expect, it } from 'vitest';
import { makeMatch } from '../__fixtures__/factory';
import { leagues } from '../config/leagues';
import { ageLabel, filterByStatus, groupByLeague, liveMinuteLabel, mergeMatches, pickFeatured, POLL_MS, pollDelay, pollStartAt, scoreLabel, statusText } from './match';

const live = (o = {}) =>
  makeMatch({ status: 'LIVE', statusName: 'STATUS_FIRST_HALF', clockSeconds: 1509, displayClock: "26'", period: 1, fetchedAt: 1_000_000, ...o });

describe('liveMinuteLabel', () => {
  it('shows the ESPN minute right after a poll', () => {
    expect(liveMinuteLabel(live(), 1_000_000)).toBe("26'");
  });

  it('advances locally between polls', () => {
    // 1509s = 25:09 -> minute 26; +60s -> 26:09 -> minute 27
    expect(liveMinuteLabel(live(), 1_000_000 + 60_000)).toBe("27'");
  });

  it('never runs past 45 in the first half without saying so', () => {
    expect(liveMinuteLabel(live({ clockSeconds: 2699 }), 1_000_000 + 600_000)).toBe("45'+");
  });

  it('caps the second half at 90', () => {
    expect(liveMinuteLabel(live({ period: 2, clockSeconds: 5300 }), 1_000_000 + 900_000)).toBe("90'+");
  });

  it('keeps ESPN stoppage-time labels as sent', () => {
    expect(liveMinuteLabel(live({ period: 2, clockSeconds: 5400, displayClock: "90'+7'" }), 1_000_000 + 30_000)).toBe("90'+7'");
  });

  it('says Descanso at half time', () => {
    expect(liveMinuteLabel(live({ statusName: 'STATUS_HALFTIME' }))).toBe('Descanso');
  });

  it('never goes backwards if the local clock is behind the poll time', () => {
    expect(liveMinuteLabel(live(), 900_000)).toBe("26'");
  });

  it('falls back to what ESPN sent when there is no clock data', () => {
    expect(liveMinuteLabel(makeMatch({ status: 'LIVE', displayClock: "63'" }))).toBe("63'");
    expect(liveMinuteLabel(makeMatch({ status: 'LIVE' }))).toBe('En vivo');
  });
});

describe('statusText', () => {
  it('translates full time, extra time and penalties', () => {
    expect(statusText(makeMatch({ status: 'FINISHED', statusDetail: 'FT' }))).toBe('Final');
    expect(statusText(makeMatch({ status: 'FINISHED', statusDetail: 'AET' }))).toBe('Final (prórroga)');
    expect(statusText(makeMatch({ status: 'FINISHED', statusDetail: 'FT-Pens' }))).toBe('Final (penales)');
  });

  it('labels postponed matches instead of showing a fake result', () => {
    expect(statusText(makeMatch({ status: 'FINISHED', statusName: 'STATUS_POSTPONED', statusDetail: 'Postponed' }))).toBe('Postergado');
  });

  it('labels scheduled matches', () => {
    expect(statusText(makeMatch())).toBe('Programado');
  });
});

describe('groupByLeague', () => {
  it('drops empty leagues and keeps the configured order when kickoffs tie', () => {
    const groups = groupByLeague([makeMatch({ id: '1', leagueId: 'ucl' }), makeMatch({ id: '2', leagueId: 'arg' })], leagues);
    expect(groups.map((g) => g.league.id)).toEqual(['arg', 'ucl']);
  });

  it('orders leagues by their earliest kickoff, with live leagues first', () => {
    const at = (h: string) => `2026-10-10T${h}:00:00Z`;
    const ids = (list: ReturnType<typeof makeMatch>[]) => groupByLeague(list, leagues).map((g) => g.league.id);
    expect(ids([makeMatch({ id: '1', leagueId: 'arg', date: at('14') }), makeMatch({ id: '2', leagueId: 'pl', date: at('08') })])).toEqual(['pl', 'arg']);
    expect(ids([makeMatch({ id: '1', leagueId: 'pl', date: at('08') }), makeMatch({ id: '2', leagueId: 'll', date: at('20'), status: 'LIVE' })])).toEqual(['ll', 'pl']);
  });

  it('puts live matches first, then sorts by kickoff', () => {
    const [g] = groupByLeague(
      [
        makeMatch({ id: 'late', date: '2026-09-28T21:00:00Z' }),
        makeMatch({ id: 'early', date: '2026-09-28T15:00:00Z' }),
        makeMatch({ id: 'live', date: '2026-09-28T23:00:00Z', status: 'LIVE' }),
      ],
      leagues,
    );
    expect(g.matches.map((m) => m.id)).toEqual(['live', 'early', 'late']);
  });
});

describe('pickFeatured', () => {
  const now = new Date('2026-09-28T12:00:00Z').getTime();

  it('prefers a live match', () => {
    const list = [makeMatch({ id: 'next', date: '2026-09-28T18:00:00Z' }), makeMatch({ id: 'live', status: 'LIVE' })];
    expect(pickFeatured(list, now)?.id).toBe('live');
  });

  it('otherwise picks the next kickoff, not the last one', () => {
    const list = [makeMatch({ id: 'b', date: '2026-10-02T18:00:00Z' }), makeMatch({ id: 'a', date: '2026-09-29T18:00:00Z' })];
    expect(pickFeatured(list, now)?.id).toBe('a');
  });

  it('otherwise picks the most recent result', () => {
    const list = [
      makeMatch({ id: 'old', status: 'FINISHED', date: '2026-09-20T18:00:00Z' }),
      makeMatch({ id: 'recent', status: 'FINISHED', date: '2026-09-26T18:00:00Z' }),
      makeMatch({ id: 'pp', status: 'FINISHED', statusName: 'STATUS_POSTPONED', date: '2026-09-27T18:00:00Z' }),
    ];
    expect(pickFeatured(list, now)?.id).toBe('recent');
  });

  it('returns undefined for an empty list', () => {
    expect(pickFeatured([], now)).toBeUndefined();
  });
});

describe('mergeMatches', () => {
  it('replaces by id, adds new ones and keeps kickoff order', () => {
    const base = [makeMatch({ id: '1', date: '2026-09-28T10:00:00Z' }), makeMatch({ id: '2', date: '2026-09-28T12:00:00Z' })];
    const fresh = [makeMatch({ id: '2', date: '2026-09-28T12:00:00Z', status: 'LIVE' }), makeMatch({ id: '3', date: '2026-09-28T11:00:00Z' })];
    const merged = mergeMatches(base, fresh);
    expect(merged.map((m) => m.id)).toEqual(['1', '3', '2']);
    expect(merged.find((m) => m.id === '2')?.status).toBe('LIVE');
  });
});

describe('filterByStatus', () => {
  it('filters and passes everything through for ALL', () => {
    const list = [makeMatch({ id: '1' }), makeMatch({ id: '2', status: 'LIVE' })];
    expect(filterByStatus(list, 'ALL')).toHaveLength(2);
    expect(filterByStatus(list, 'LIVE').map((m) => m.id)).toEqual(['2']);
  });
});

describe('pollStartAt', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');

  it('starts right away while a match is live', () => {
    expect(pollStartAt([makeMatch({ status: 'LIVE' }), makeMatch({ id: '2', date: '2026-09-28T20:00:00Z' })], now)).toBe(0);
  });

  it('waits for the next kickoff when nothing is live yet', () => {
    const list = [makeMatch({ id: '1', date: '2026-09-28T19:00:00Z' }), makeMatch({ id: '2', date: '2026-09-28T16:00:00Z' })];
    expect(pollStartAt(list, now)).toBe(Date.parse('2026-09-28T16:00:00Z'));
  });

  it('keeps polling a kickoff that ESPN still reports as scheduled, but not one stale for over 3 h', () => {
    expect(pollStartAt([makeMatch({ date: '2026-09-28T10:00:00Z' })], now)).toBe(Date.parse('2026-09-28T10:00:00Z'));
    expect(pollStartAt([makeMatch({ date: '2026-09-28T08:00:00Z' })], now)).toBeUndefined();
  });

  it('never polls when every match is finished', () => {
    expect(pollStartAt([makeMatch({ status: 'FINISHED', score: { home: 1, away: 0 } })], now)).toBeUndefined();
  });
});

describe('scoreLabel', () => {
  it('reads the score and the shootout', () => {
    expect(scoreLabel(makeMatch({ status: 'FINISHED', score: { home: 1, away: 1 }, penalties: { home: 4, away: 3 } }))).toBe('1 a 1, penales 4 a 3');
  });

  it('has nothing to read for a postponed match', () => {
    expect(scoreLabel(makeMatch({ status: 'FINISHED', statusName: 'STATUS_POSTPONED', score: { home: 0, away: 0 } }))).toBeUndefined();
  });
});

describe('pollDelay', () => {
  it('keeps the normal rate while healthy and after the first miss', () => {
    expect(pollDelay(0)).toBe(POLL_MS);
    expect(pollDelay(1)).toBe(POLL_MS);
  });

  it('doubles after each further miss', () => {
    expect([2, 3, 4].map(pollDelay)).toEqual([60_000, 120_000, 240_000]);
  });

  it('never waits more than 5 minutes', () => {
    expect(pollDelay(5)).toBe(300_000);
    expect(pollDelay(500)).toBe(300_000);
  });
});

describe('ageLabel', () => {
  it.each([
    [0, '0 s'],
    [12_900, '12 s'],
    [59_999, '59 s'],
    [60_000, '1 min'],
    [179_000, '2 min'],
    [3_600_000, '1 h'],
    [-5_000, '0 s'],
  ])('%i ms -> %s', (ms, label) => expect(ageLabel(ms)).toBe(label));
});
