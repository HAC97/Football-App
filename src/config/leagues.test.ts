import { describe, expect, it } from 'vitest';
import { leagueById, leagues } from './leagues';

describe('leagues config', () => {
  it('has unique ids, ESPN slugs and glyphs (they key the URL, the requests and the fallback logo)', () => {
    for (const key of ['id', 'espnSlug', 'glyph'] as const) {
      const values = leagues.map((l) => l[key]);
      expect(new Set(values).size, `duplicate ${key}: ${values.join(', ')}`).toBe(values.length);
    }
  });

  it('uses ids the URL accepts and well-formed slugs, glyphs and colors', () => {
    for (const l of leagues) {
      expect(l.id, l.name).toMatch(/^[a-z]{2,5}$/);
      expect(l.espnSlug, l.name).toMatch(/^[a-z]+\.[a-z0-9]+$/);
      expect(l.glyph, l.name).toMatch(/^[A-Z]{2}$/);
      expect(l.color, l.name).toMatch(/^#[0-9A-F]{6}$/i);
      expect(l.name.trim(), l.id).not.toBe('');
    }
  });

  it('includes Copa Sudamericana, next to the other South American cup', () => {
    const sud = leagueById('sud');
    expect(sud).toMatchObject({ name: 'Copa Sudamericana', espnSlug: 'conmebol.sudamericana', country: 'Sudamérica' });
    expect(leagues.findIndex((l) => l.id === 'sud')).toBe(leagues.findIndex((l) => l.id === 'lib') + 1);
  });
});
