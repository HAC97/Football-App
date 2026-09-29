import { describe, expect, it } from 'vitest';
import { capitalize, dayKey, dayWindow, espnDay, espnMonths, pickDefaultDay } from './date';

describe('espnMonths', () => {
  it('returns one month when the range stays inside it', () => {
    expect(espnMonths(new Date(2026, 8, 3), new Date(2026, 8, 20))).toEqual(['202609']);
  });

  it('covers every month touched, in order (ESPN rejects day ranges, so we ask by month)', () => {
    expect(espnMonths(new Date(2026, 8, 21), new Date(2026, 9, 12))).toEqual(['202609', '202610']);
  });

  it('crosses the year boundary', () => {
    expect(espnMonths(new Date(2026, 11, 28), new Date(2027, 0, 10))).toEqual(['202612', '202701']);
  });

  it('does not skip a month when the range starts on the 31st', () => {
    expect(espnMonths(new Date(2026, 0, 31), new Date(2026, 2, 1))).toEqual(['202601', '202602', '202603']);
  });
});

describe('dayWindow', () => {
  it('spans 7 days back and 14 ahead, with today at index 7', () => {
    const today = new Date(2026, 8, 28, 15, 30);
    const days = dayWindow(today);
    expect(days).toHaveLength(22);
    expect(dayKey(days[7])).toBe('2026-09-28');
    expect(dayKey(days[0])).toBe('2026-09-21');
    expect(dayKey(days.at(-1)!)).toBe('2026-10-12');
  });
});

describe('dayKey / espnDay', () => {
  it('uses the local calendar day', () => {
    const d = new Date(2026, 0, 5, 23, 59);
    expect(dayKey(d)).toBe('2026-01-05');
    expect(espnDay(d)).toBe('20260105');
  });
});

describe('pickDefaultDay', () => {
  it('keeps today when it has matches', () => {
    expect(pickDefaultDay(['2026-09-27', '2026-09-28', '2026-09-30'], '2026-09-28')).toBe('2026-09-28');
  });
  it('prefers the nearest later day when today is empty', () => {
    expect(pickDefaultDay(['2026-09-21', '2026-10-02', '2026-10-05'], '2026-09-28')).toBe('2026-10-02');
  });
  it('falls back to the latest earlier day when nothing is ahead', () => {
    expect(pickDefaultDay(['2026-09-21', '2026-09-24'], '2026-09-28')).toBe('2026-09-24');
  });
  it('returns today when there are no matches at all', () => {
    expect(pickDefaultDay([], '2026-09-28')).toBe('2026-09-28');
  });
});

describe('capitalize', () => {
  it('uppercases only the first letter', () => {
    expect(capitalize('viernes 2 de octubre')).toBe('Viernes 2 de octubre');
  });
});
