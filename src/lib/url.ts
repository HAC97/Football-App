import type { StatusFilter } from './match';

/** What the address bar carries: enough to share or restore a view. Theme and standings are per-person and stay out. */
export interface UrlState {
  /** League id, or null for all. */
  liga: string | null;
  /** Day key "yyyy-MM-dd", or null for the default day. */
  dia: string | null;
  estado: StatusFilter;
  /** Id of the match whose detail is open. */
  partido: string | null;
}

export const EMPTY_URL_STATE: UrlState = { liga: null, dia: null, estado: 'ALL', partido: null };

const ESTADO_PARAM = { LIVE: 'vivo', SCHEDULED: 'proximos', FINISHED: 'finalizados' } as const;
const ESTADO_FROM_PARAM: Record<string, StatusFilter> = { vivo: 'LIVE', proximos: 'SCHEDULED', finalizados: 'FINISHED' };

/** ESPN ids are numeric; this only keeps junk (markup, huge strings) out of state that ends up in lookups. */
const MATCH_ID = /^[\w.-]{1,40}$/;

function validDay(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}

/** Reads a query string. Every value is validated, so a hand-edited or stale link degrades to the default view. */
export function parseUrl(search: string, leagueIds: string[]): UrlState {
  const p = new URLSearchParams(search);
  const liga = p.get('liga');
  const dia = p.get('dia');
  const estado = p.get('estado');
  const partido = p.get('partido');
  return {
    liga: liga && leagueIds.includes(liga) ? liga : null,
    dia: dia && validDay(dia) ? dia : null,
    // hasOwn: a plain lookup would answer "toString" or "constructor" with a function from the prototype.
    estado: estado && Object.hasOwn(ESTADO_FROM_PARAM, estado) ? ESTADO_FROM_PARAM[estado] : 'ALL',
    partido: partido && MATCH_ID.test(partido) ? partido : null,
  };
}

/** Query string for a state ("" when everything is default), so the default view has a clean URL. */
export function buildSearch(state: UrlState): string {
  const p = new URLSearchParams();
  if (state.liga) p.set('liga', state.liga);
  if (state.dia) p.set('dia', state.dia);
  if (state.estado !== 'ALL') p.set('estado', ESTADO_PARAM[state.estado]);
  if (state.partido) p.set('partido', state.partido);
  const s = p.toString();
  return s ? `?${s}` : '';
}
