import type { League } from '../types';

export const leagues: League[] = [
  { id: 'arg', name: 'Liga Profesional', country: 'Argentina', espnSlug: 'arg.1', glyph: 'AR', color: '#43A1D5' },
  { id: 'pl', name: 'Premier League', country: 'Inglaterra', espnSlug: 'eng.1', glyph: 'PL', color: '#8A4BD1' },
  { id: 'sa', name: 'Serie A', country: 'Italia', espnSlug: 'ita.1', glyph: 'SA', color: '#2F7BE0' },
  { id: 'll', name: 'LaLiga', country: 'España', espnSlug: 'esp.1', glyph: 'LL', color: '#F0524B' },
  { id: 'lib', name: 'Copa Libertadores', country: 'Sudamérica', espnSlug: 'conmebol.libertadores', glyph: 'CL', color: '#C9A13B' },
  { id: 'ucl', name: 'Champions League', country: 'Europa', espnSlug: 'uefa.champions', glyph: 'UC', color: '#3D6BFF' },
];

export const leagueById = (id: string): League | undefined => leagues.find((l) => l.id === id);
