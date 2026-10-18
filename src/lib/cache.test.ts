import { describe, expect, it } from 'vitest';
import { makeMatch } from '../__fixtures__/factory';
import { CACHE_MAX_AGE_MS, CACHE_VERSION, parseCache, serializeCache } from './cache';

const NOW = 1_800_000_000_000;
const matches = [makeMatch({ id: 'a' }), makeMatch({ id: 'b', status: 'FINISHED', score: { home: 1, away: 0 } })];
const meta = { ll: { logo: 'https://x/ll.png' } };
const entry = (over: Record<string, unknown> = {}) => JSON.stringify({ v: CACHE_VERSION, savedAt: NOW - 60_000, matches, meta, ...over });

describe('parseCache', () => {
  it('round-trips what serializeCache wrote', () => {
    const out = parseCache(serializeCache(matches, meta, NOW - 5_000), NOW);
    expect(out).toEqual({ matches, meta, savedAt: NOW - 5_000 });
  });

  it('is absent when nothing is stored', () => {
    expect(parseCache(null, NOW)).toBeNull();
    expect(parseCache('', NOW)).toBeNull();
  });

  it('ignores an entry older than the max age, but keeps one right at the limit', () => {
    expect(parseCache(entry({ savedAt: NOW - CACHE_MAX_AGE_MS - 1 }), NOW)).toBeNull();
    expect(parseCache(entry({ savedAt: NOW - CACHE_MAX_AGE_MS }), NOW)).not.toBeNull();
  });

  it('ignores an entry saved in the future (clock changed), tolerating a minute of skew', () => {
    expect(parseCache(entry({ savedAt: NOW + 3_600_000 }), NOW)).toBeNull();
    expect(parseCache(entry({ savedAt: NOW + 30_000 }), NOW)).not.toBeNull();
  });

  it('ignores another version of the format', () => {
    expect(parseCache(entry({ v: CACHE_VERSION + 1 }), NOW)).toBeNull();
    expect(parseCache(entry({ v: undefined }), NOW)).toBeNull();
  });

  it.each([
    ['not JSON', '{oops'],
    ['a JSON scalar', '42'],
    ['null', 'null'],
    ['no matches', entry({ matches: [] })],
    ['matches not an array', entry({ matches: { a: 1 } })],
    ['a match without id', entry({ matches: [{ ...matches[0], id: undefined }] })],
    ['a match with an unknown status', entry({ matches: [{ ...matches[0], status: 'PAUSED' }] })],
    ['a match without teams', entry({ matches: [{ ...matches[0], homeTeam: undefined }] })],
    ['savedAt as text', entry({ savedAt: 'yesterday' })],
  ])('ignores a malformed entry: %s', (_label, raw) => {
    expect(parseCache(raw, NOW)).toBeNull();
  });

  it('falls back to empty meta when it is missing or not an object', () => {
    expect(parseCache(entry({ meta: undefined }), NOW)?.meta).toEqual({});
    expect(parseCache(entry({ meta: [1, 2] }), NOW)?.meta).toEqual({});
  });
});
