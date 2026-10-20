// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { makeMatch } from '../__fixtures__/factory';
import { leagues } from '../config/leagues';
import type { Match } from '../types';
import { CACHE_KEY, CACHE_VERSION, serializeCache } from '../lib/cache';
import { useMatches } from './useMatches';

const api = vi.hoisted(() => ({ fetchWindow: vi.fn(), fetchToday: vi.fn() }));
vi.mock('../services/espn', () => api);

const NOW = new Date(2026, 9, 17, 12).getTime();
const HOUR = 3600_000;
const POLL_MS = 30_000;

const result = (matches: Match[], failed: string[] = []) => ({ matches, meta: {}, failed });
const live = (over: Partial<Match> = {}) => makeMatch({ id: 'live', status: 'LIVE', statusName: 'STATUS_IN_PROGRESS', score: { home: 0, away: 0 }, date: new Date(NOW - HOUR).toISOString(), ...over });
const upcoming = (inMs: number) => makeMatch({ id: 'next', date: new Date(NOW + inMs).toISOString() });
const finished = makeMatch({ id: 'done', status: 'FINISHED', statusName: 'STATUS_FULL_TIME', score: { home: 1, away: 0 }, date: new Date(NOW - 5 * HOUR).toISOString() });

const setHidden = (hidden: boolean) => Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const mount = async () => {
  const hook = renderHook(() => useMatches());
  await advance(0);
  return hook;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  setHidden(false);
  localStorage.clear();
  api.fetchWindow.mockReset();
  api.fetchToday.mockReset();
  api.fetchToday.mockResolvedValue(result([]));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useMatches: loading', () => {
  it('starts loading, then exposes the matches', async () => {
    api.fetchWindow.mockResolvedValue(result([finished]));
    const { result: r } = renderHook(() => useMatches());
    expect(r.current.loading).toBe(true);

    await advance(0);
    expect(r.current.loading).toBe(false);
    expect(r.current.matches).toEqual([finished]);
    expect(r.current.error).toBe(false);
    expect(r.current.hasLive).toBe(false);
  });

  it('reports error only when every league failed and nothing loaded', async () => {
    api.fetchWindow.mockResolvedValue(result([], leagues.map((l) => l.id)));
    const { result: r } = await mount();
    expect(r.current.error).toBe(true);
  });

  it('keeps showing what loaded when only some leagues fail', async () => {
    api.fetchWindow.mockResolvedValue(result([finished], ['pl']));
    const { result: r } = await mount();
    expect(r.current.error).toBe(false);
    expect(r.current.failed).toEqual(['pl']);
    expect(r.current.matches).toHaveLength(1);
  });

  it('treats a rejected request as every league failing', async () => {
    api.fetchWindow.mockRejectedValue(new Error('boom'));
    const { result: r } = await mount();
    expect(r.current.error).toBe(true);
    expect(r.current.loading).toBe(false);
  });

  it('reload fetches again and recovers', async () => {
    api.fetchWindow.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(result([finished]));
    const { result: r } = await mount();
    expect(r.current.error).toBe(true);

    act(() => r.current.reload());
    expect(r.current.loading).toBe(true);
    await advance(0);
    expect(api.fetchWindow).toHaveBeenCalledTimes(2);
    expect(r.current.error).toBe(false);
    expect(r.current.matches).toEqual([finished]);
  });
});

describe('useMatches: polling', () => {
  it('does not poll when nothing can still change', async () => {
    api.fetchWindow.mockResolvedValue(result([finished]));
    await mount();
    await advance(10 * POLL_MS);
    expect(api.fetchToday).not.toHaveBeenCalled();
  });

  it('polls today every 30 s while a match is live, and merges the fresh score', async () => {
    api.fetchWindow.mockResolvedValue(result([live(), finished]));
    api.fetchToday.mockResolvedValue(result([live({ score: { home: 1, away: 0 } })]));
    const { result: r } = await mount();
    expect(r.current.hasLive).toBe(true);

    await advance(POLL_MS - 1);
    expect(api.fetchToday).not.toHaveBeenCalled();
    await advance(1);
    expect(api.fetchToday).toHaveBeenCalledTimes(1);
    expect(r.current.matches.find((m) => m.id === 'live')?.score).toEqual({ home: 1, away: 0 });
    expect(r.current.matches.find((m) => m.id === 'done')).toBeTruthy(); // the window is kept, not replaced

    await advance(POLL_MS);
    expect(api.fetchToday).toHaveBeenCalledTimes(2);
  });

  it('waits for the next kickoff before the first poll', async () => {
    api.fetchWindow.mockResolvedValue(result([upcoming(2 * HOUR)]));
    await mount();

    await advance(2 * HOUR - 1);
    expect(api.fetchToday).not.toHaveBeenCalled();
    await advance(1);
    expect(api.fetchToday).toHaveBeenCalledTimes(1);
  });

  it('stops polling once the match is over', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    api.fetchToday.mockResolvedValue(result([live({ status: 'FINISHED', statusName: 'STATUS_FULL_TIME', score: { home: 2, away: 1 } })]));
    const { result: r } = await mount();

    await advance(POLL_MS);
    expect(r.current.hasLive).toBe(false);
    const calls = api.fetchToday.mock.calls.length;
    await advance(10 * POLL_MS);
    expect(api.fetchToday).toHaveBeenCalledTimes(calls);
  });

  it('skips polls while the tab is hidden and refreshes as soon as it is visible again', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    await mount();

    setHidden(true);
    await advance(3 * POLL_MS);
    expect(api.fetchToday).not.toHaveBeenCalled();

    setHidden(false);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(api.fetchToday).toHaveBeenCalledTimes(1);
  });

  it('keeps the last data and keeps polling when a poll fails', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    api.fetchToday.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(result([live({ score: { home: 3, away: 0 } })]));
    const { result: r } = await mount();

    await advance(POLL_MS);
    expect(r.current.matches[0].score).toEqual({ home: 0, away: 0 });
    expect(r.current.error).toBe(false);

    await advance(POLL_MS);
    expect(r.current.matches[0].score).toEqual({ home: 3, away: 0 });
  });

  it('aborts the in-flight poll and clears the timers on unmount', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    let signal: AbortSignal | undefined;
    api.fetchToday.mockImplementation((_leagues: unknown, s: AbortSignal) => {
      signal = s;
      return new Promise(() => {});
    });
    const { unmount } = await mount();

    await advance(POLL_MS);
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);

    const calls = api.fetchToday.mock.calls.length;
    await advance(5 * POLL_MS);
    expect(api.fetchToday).toHaveBeenCalledTimes(calls);
  });
});

describe('useMatches: cache', () => {
  const stored = () => JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
  const seed = (matches: Match[], savedAt = NOW - 10 * 60_000) => localStorage.setItem(CACHE_KEY, serializeCache(matches, { ll: { logo: 'cached.png' } }, savedAt));
  const cachedLl = makeMatch({ id: 'c-ll', leagueId: 'll', status: 'FINISHED', statusName: 'STATUS_FULL_TIME', score: { home: 1, away: 0 }, date: new Date(NOW - 5 * HOUR).toISOString() });
  const cachedPl = makeMatch({ id: 'c-pl', leagueId: 'pl', status: 'FINISHED', statusName: 'STATUS_FULL_TIME', score: { home: 2, away: 2 }, date: new Date(NOW - 6 * HOUR).toISOString() });
  const freshLl = makeMatch({ id: 'f-ll', leagueId: 'll', status: 'FINISHED', statusName: 'STATUS_FULL_TIME', score: { home: 3, away: 1 }, date: new Date(NOW - 5 * HOUR).toISOString() });

  it('paints from the cache right away, without waiting for the network', () => {
    seed([cachedLl]);
    api.fetchWindow.mockReturnValue(new Promise(() => {}));
    const { result: r } = renderHook(() => useMatches());

    expect(r.current.loading).toBe(false);
    expect(r.current.matches).toEqual([cachedLl]);
    expect(r.current.meta).toEqual({ ll: { logo: 'cached.png' } });
    expect(r.current.lastUpdated).toBe(NOW - 10 * 60_000);
  });

  it('still fetches and replaces the cached data with the fresh answer', async () => {
    seed([cachedLl]);
    api.fetchWindow.mockResolvedValue(result([freshLl]));
    const { result: r } = await mount();

    expect(api.fetchWindow).toHaveBeenCalledTimes(1);
    expect(r.current.matches).toEqual([freshLl]);
    expect(r.current.lastUpdated).toBe(NOW);
  });

  it('shows the loading state, not stale data, when the cache is expired or unusable', () => {
    api.fetchWindow.mockReturnValue(new Promise(() => {}));
    for (const raw of [serializeCache([cachedLl], {}, NOW - 3 * HOUR), '{broken', JSON.stringify({ v: 999, savedAt: NOW, matches: [cachedLl] })]) {
      localStorage.setItem(CACHE_KEY, raw);
      const { result: r, unmount } = renderHook(() => useMatches());
      expect(r.current.loading).toBe(true);
      expect(r.current.matches).toEqual([]);
      unmount();
    }
  });

  it('saves a confirmed answer for the next visit', async () => {
    api.fetchWindow.mockResolvedValue(result([freshLl]));
    await mount();
    expect(stored()).toMatchObject({ v: CACHE_VERSION, savedAt: NOW, matches: [freshLl] });
  });

  it('does not rewrite the cache just because it was read (keeps its original age)', async () => {
    seed([cachedLl]);
    api.fetchWindow.mockReturnValue(new Promise(() => {}));
    renderHook(() => useMatches());
    await advance(0);
    expect(stored().savedAt).toBe(NOW - 10 * 60_000);
  });

  it('writes nothing until ESPN has answered', async () => {
    api.fetchWindow.mockReturnValue(new Promise(() => {}));
    renderHook(() => useMatches());
    await advance(0);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it('writes nothing when every league failed and there was no cache', async () => {
    api.fetchWindow.mockResolvedValue(result([], leagues.map((l) => l.id)));
    await mount();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it('keeps showing the cache, and its true age, when every league is down', async () => {
    seed([cachedLl]);
    api.fetchWindow.mockResolvedValue(result([], leagues.map((l) => l.id)));
    const { result: r } = await mount();

    expect(r.current.error).toBe(false);
    expect(r.current.matches).toEqual([cachedLl]);
    expect(r.current.failed).toHaveLength(leagues.length);
    expect(r.current.lastUpdated).toBe(NOW - 10 * 60_000);
    expect(stored().matches).toEqual([cachedLl]); // an outage never overwrites good data
  });

  it('keeps showing the cache when the request itself rejects', async () => {
    seed([cachedLl]);
    api.fetchWindow.mockRejectedValue(new Error('offline'));
    const { result: r } = await mount();
    expect(r.current.error).toBe(false);
    expect(r.current.matches).toEqual([cachedLl]);
  });

  it('keeps the cached matches of a league that failed and takes fresh ones for the rest', async () => {
    seed([cachedLl, cachedPl]);
    api.fetchWindow.mockResolvedValue(result([freshLl], ['pl']));
    const { result: r } = await mount();

    expect(r.current.matches.map((m) => m.id).sort()).toEqual(['c-pl', 'f-ll']);
    expect(r.current.failed).toEqual(['pl']);
  });

  it('persists each confirmed poll so the next visit starts from the latest score', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    api.fetchToday.mockResolvedValue(result([live({ score: { home: 2, away: 0 } })]));
    await mount();
    await advance(POLL_MS);

    expect(stored().matches[0].score).toEqual({ home: 2, away: 0 });
    expect(stored().savedAt).toBe(NOW + POLL_MS);
  });

  it('works when storage is blocked', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    api.fetchWindow.mockResolvedValue(result([freshLl]));
    const { result: r } = renderHook(() => useMatches());
    expect(r.current.loading).toBe(true);
    await advance(0);
    expect(r.current.matches).toEqual([freshLl]);
    get.mockRestore();
    set.mockRestore();
  });
});

describe('useMatches: stale data', () => {
  const allFailed = result([], leagues.map((l) => l.id));

  it('starts healthy, with lastUpdated at the load time', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    const { result: r } = await mount();
    expect(r.current.pollFailures).toBe(0);
    expect(r.current.lastUpdated).toBe(NOW);
  });

  it('counts a poll where every league failed as a miss, even though the request did not reject', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    api.fetchToday.mockResolvedValue(allFailed);
    const { result: r } = await mount();

    await advance(POLL_MS);
    expect(r.current.pollFailures).toBe(1);
    expect(r.current.lastUpdated).toBe(NOW);
    expect(r.current.matches).toHaveLength(1);
  });

  it('backs off 30 s, 30 s, 60 s, 120 s while the API stays down', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    api.fetchToday.mockResolvedValue(allFailed);
    const { result: r } = await mount();

    const callsAfter = async (ms: number) => {
      await advance(ms);
      return api.fetchToday.mock.calls.length;
    };
    expect(await callsAfter(POLL_MS)).toBe(1);
    expect(await callsAfter(POLL_MS - 1)).toBe(1);
    expect(await callsAfter(1)).toBe(2); // 30 s after the first miss
    expect(await callsAfter(2 * POLL_MS - 1)).toBe(2);
    expect(await callsAfter(1)).toBe(3); // 60 s after the second
    expect(await callsAfter(4 * POLL_MS)).toBe(4); // 120 s after the third
    expect(r.current.pollFailures).toBe(4);
  });

  it('recovers: one good poll clears the failures, refreshes lastUpdated and returns to the normal rate', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    api.fetchToday.mockResolvedValueOnce(allFailed).mockResolvedValueOnce(allFailed).mockResolvedValue(result([live({ score: { home: 1, away: 1 } })]));
    const { result: r } = await mount();

    await advance(POLL_MS); // miss 1
    await advance(POLL_MS); // miss 2
    expect(r.current.pollFailures).toBe(2);
    await advance(2 * POLL_MS); // backed off 60 s, then succeeds
    expect(r.current.pollFailures).toBe(0);
    expect(r.current.lastUpdated).toBe(NOW + 4 * POLL_MS);

    const calls = api.fetchToday.mock.calls.length;
    await advance(POLL_MS);
    expect(api.fetchToday).toHaveBeenCalledTimes(calls + 1);
  });

  it('a poll where only some leagues fail still counts as healthy', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    api.fetchToday.mockResolvedValue(result([live({ score: { home: 2, away: 0 } })], ['pl']));
    const { result: r } = await mount();

    await advance(POLL_MS);
    expect(r.current.pollFailures).toBe(0);
    expect(r.current.lastUpdated).toBe(NOW + POLL_MS);
  });

  it('does not start a second request while one is still in flight', async () => {
    api.fetchWindow.mockResolvedValue(result([live()]));
    api.fetchToday.mockImplementation(() => new Promise(() => {}));
    await mount();

    await advance(10 * POLL_MS);
    expect(api.fetchToday).toHaveBeenCalledTimes(1);
  });
});
