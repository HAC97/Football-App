import { describe, expect, it } from 'vitest';
import { buildSearch, EMPTY_URL_STATE, parseUrl, type UrlState } from './url';

const IDS = ['arg', 'pl', 'll'];
const parse = (search: string) => parseUrl(search, IDS);

describe('parseUrl', () => {
  it('reads every field', () => {
    expect(parse('?liga=pl&dia=2026-10-18&estado=finalizados&partido=401234')).toEqual({ liga: 'pl', dia: '2026-10-18', estado: 'FINISHED', partido: '401234' });
  });

  it('gives the default view for an empty address', () => {
    expect(parse('')).toEqual(EMPTY_URL_STATE);
    expect(parse('?')).toEqual(EMPTY_URL_STATE);
  });

  it('maps the three status words and nothing else', () => {
    expect(parse('?estado=vivo').estado).toBe('LIVE');
    expect(parse('?estado=proximos').estado).toBe('SCHEDULED');
    expect(parse('?estado=finalizados').estado).toBe('FINISHED');
    expect(parse('?estado=todos').estado).toBe('ALL');
    expect(parse('?estado=LIVE').estado).toBe('ALL');
  });

  it.each(['toString', 'constructor', '__proto__', 'hasOwnProperty'])('does not answer %s from the prototype chain', (estado) => {
    expect(parse(`?estado=${estado}`).estado).toBe('ALL');
  });

  it('ignores a league that does not exist', () => {
    expect(parse('?liga=xx').liga).toBeNull();
    expect(parse('?liga=').liga).toBeNull();
  });

  it.each(['2026-13-01', '2026-02-30', '2026-1-5', '26-10-18', 'hoy', '2026-10-18T00:00', '2026-10-18 '])('ignores the invalid day %j', (dia) => {
    expect(parse(`?dia=${encodeURIComponent(dia)}`).dia).toBeNull();
  });

  it('accepts a real leap day and rejects a fake one', () => {
    expect(parse('?dia=2028-02-29').dia).toBe('2028-02-29');
    expect(parse('?dia=2027-02-29').dia).toBeNull();
  });

  it.each(['<script>', 'a b', '../x', 'x'.repeat(41), ''])('ignores the unsafe match id %j', (partido) => {
    expect(parse(`?partido=${encodeURIComponent(partido)}`).partido).toBeNull();
  });

  it('keeps one bad field from spoiling the rest', () => {
    expect(parse('?liga=xx&dia=nope&estado=vivo&partido=77')).toEqual({ liga: null, dia: null, estado: 'LIVE', partido: '77' });
  });
});

describe('buildSearch', () => {
  it('is empty for the default view, so the address stays clean', () => {
    expect(buildSearch(EMPTY_URL_STATE)).toBe('');
  });

  it('writes only what differs from the default, in a stable order', () => {
    expect(buildSearch({ liga: 'pl', dia: null, estado: 'LIVE', partido: null })).toBe('?liga=pl&estado=vivo');
    expect(buildSearch({ liga: 'pl', dia: '2026-10-18', estado: 'ALL', partido: '9' })).toBe('?liga=pl&dia=2026-10-18&partido=9');
  });

  it('round-trips every combination of fields', () => {
    const states: UrlState[] = [];
    for (const liga of [null, 'arg', 'll'])
      for (const dia of [null, '2026-10-17'])
        for (const estado of ['ALL', 'LIVE', 'SCHEDULED', 'FINISHED'] as const)
          for (const partido of [null, '401'])
            states.push({ liga, dia, estado, partido });
    expect(states).toHaveLength(48);
    for (const s of states) expect(parse(buildSearch(s))).toEqual(s);
  });
});
