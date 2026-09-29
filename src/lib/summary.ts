import type { Match } from '../types';

/* ---- Raw ESPN summary: only what we read ---- */

interface RawAthlete {
  id?: string;
  displayName?: string;
  shortName?: string;
}

interface RawKeyEvent {
  id: string;
  type?: { type?: string; text?: string };
  text?: string;
  shortText?: string;
  clock?: { displayValue?: string; value?: number };
  scoringPlay?: boolean;
  shootout?: boolean;
  team?: { id?: string };
  participants?: { athlete?: RawAthlete }[];
}

interface RawRosterEntry {
  starter?: boolean;
  jersey?: string;
  athlete?: RawAthlete;
  position?: { abbreviation?: string; displayName?: string };
  subbedIn?: boolean;
  subbedOut?: boolean;
}

export interface RawSummary {
  boxscore?: { teams?: { homeAway?: 'home' | 'away'; statistics?: { name: string; displayValue?: string }[] }[] };
  rosters?: { homeAway?: 'home' | 'away'; formation?: string; roster?: RawRosterEntry[] }[];
  keyEvents?: RawKeyEvent[];
}

/* ---- Stats ---- */

export interface StatRow {
  key: string;
  label: string;
  home: number;
  away: number;
  /** "54%" style suffix for the numbers. */
  suffix: string;
}

const STAT_DEFS: { key: string; label: string; suffix?: string }[] = [
  { key: 'possessionPct', label: 'Posesión', suffix: '%' },
  { key: 'totalShots', label: 'Remates' },
  { key: 'shotsOnTarget', label: 'Remates al arco' },
  { key: 'blockedShots', label: 'Remates bloqueados' },
  { key: 'wonCorners', label: 'Córners' },
  { key: 'totalPasses', label: 'Pases' },
  { key: 'accuratePasses', label: 'Pases precisos' },
  { key: 'saves', label: 'Atajadas' },
  { key: 'foulsCommitted', label: 'Faltas' },
  { key: 'offsides', label: 'Fuera de juego' },
  { key: 'yellowCards', label: 'Amarillas' },
  { key: 'redCards', label: 'Rojas' },
  { key: 'totalTackles', label: 'Entradas' },
  { key: 'interceptions', label: 'Intercepciones' },
  { key: 'totalClearance', label: 'Despejes' },
];

/**
 * ESPN keeps stats per team under `boxscore.teams[].statistics`.
 * (The old code read `boxscore.statistics`, which does not exist, so no stats ever rendered.)
 * Rows where both sides have no value are dropped.
 */
export function parseStats(summary: RawSummary): StatRow[] {
  const teams = summary.boxscore?.teams ?? [];
  const home = teams.find((t) => t.homeAway === 'home') ?? teams[0];
  const away = teams.find((t) => t.homeAway === 'away') ?? teams[1];
  if (!home || !away) return [];
  const read = (t: typeof home, key: string): number | undefined => {
    const raw = t.statistics?.find((s) => s.name === key)?.displayValue;
    const n = raw === undefined ? NaN : parseFloat(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const rows: StatRow[] = [];
  for (const def of STAT_DEFS) {
    const h = read(home, def.key);
    const a = read(away, def.key);
    if (h === undefined && a === undefined) continue;
    rows.push({ key: def.key, label: def.label, home: h ?? 0, away: a ?? 0, suffix: def.suffix ?? '' });
  }
  return rows;
}

/** Share of the bar for the home side, 0..100. Two zeros give an even split. */
export const homeShare = (row: Pick<StatRow, 'home' | 'away'>): number => {
  const total = row.home + row.away;
  return total === 0 ? 50 : (row.home / total) * 100;
};

/* ---- Events ---- */

export type EventKind = 'goal' | 'own-goal' | 'penalty-goal' | 'penalty-miss' | 'yellow' | 'red' | 'sub' | 'var' | 'period' | 'other';

export interface TimelineEvent {
  id: string;
  minute: string;
  kind: EventKind;
  side: 'home' | 'away' | null;
  /** Main player (scorer, booked player, player coming on). */
  player: string;
  /** Secondary text (player going off, assist, phase name). */
  detail?: string;
  /** Running score after this goal, e.g. "1–0". Shootout kicks do not count. */
  score?: string;
}

const PERIOD_TEXT: Record<string, string> = {
  kickoff: 'Comienza el partido',
  halftime: 'Fin del primer tiempo',
  'start-2nd-half': 'Comienza el segundo tiempo',
  'end-regular-time': 'Fin del tiempo reglamentario',
  'end-match': 'Fin del partido',
  'end-2nd-half': 'Fin del partido',
  'start-extra-time': 'Comienza la prórroga',
  'end-extra-time': 'Fin de la prórroga',
  'start-delay': 'Partido demorado',
  'end-delay': 'Se reanuda el partido',
};

const KIND_BY_TYPE: Record<string, EventKind> = {
  goal: 'goal',
  'own-goal': 'own-goal',
  'penalty---scored': 'penalty-goal',
  'penalty-goal': 'penalty-goal',
  'penalty---missed': 'penalty-miss',
  'penalty---saved': 'penalty-miss',
  'yellow-card': 'yellow',
  'red-card': 'red',
  substitution: 'sub',
  var: 'var',
};

export function parseEvents(summary: RawSummary, match: Pick<Match, 'homeTeam' | 'awayTeam'>): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  const tally = { home: 0, away: 0 };
  for (const ev of summary.keyEvents ?? []) {
    const type = ev.type?.type ?? '';
    const minute = ev.clock?.displayValue;
    if (!minute) continue;
    const side = ev.team?.id === match.homeTeam.id ? 'home' : ev.team?.id === match.awayTeam.id ? 'away' : null;
    const p1 = ev.participants?.[0]?.athlete?.displayName;
    const p2 = ev.participants?.[1]?.athlete?.displayName;
    const kind: EventKind | undefined = KIND_BY_TYPE[type] ?? (PERIOD_TEXT[type] ? 'period' : undefined);
    if (!kind) continue;
    if (kind === 'period') {
      // ESPN often sends the same marker twice (e.g. start-delay); show it once.
      const prev = out.at(-1);
      if (prev?.kind === 'period' && prev.minute === minute && prev.player === PERIOD_TEXT[type]) continue;
      out.push({ id: ev.id, minute, kind, side: null, player: PERIOD_TEXT[type] });
    } else if (kind === 'sub') {
      out.push({ id: ev.id, minute, kind, side, player: p1 ?? 'Jugador', detail: p2 });
    } else if (kind === 'var') {
      out.push({ id: ev.id, minute, kind, side, player: 'Revisión del VAR', detail: ev.shortText ?? ev.text });
    } else {
      let score: string | undefined;
      if ((kind === 'goal' || kind === 'penalty-goal' || kind === 'own-goal') && !ev.shootout && side) {
        // An own goal counts for the other side.
        const scoring = kind === 'own-goal' ? (side === 'home' ? 'away' : 'home') : side;
        tally[scoring] += 1;
        score = `${tally.home}–${tally.away}`;
      }
      out.push({ id: ev.id, minute, kind, side, player: p1 ?? 'Jugador', detail: kind === 'goal' && p2 ? `Asistencia: ${p2}` : undefined, score });
    }
  }
  return out;
}

export const isGoal = (e: TimelineEvent): boolean => e.kind === 'goal' || e.kind === 'penalty-goal' || e.kind === 'own-goal';

/* ---- Lineups ---- */

export interface LineupPlayer {
  id: string;
  name: string;
  jersey: string;
  position: string;
  subbedOut: boolean;
  subbedIn: boolean;
}

export interface Lineup {
  side: 'home' | 'away';
  formation: string;
  /** Rows from goalkeeper (first) to the attack (last). */
  rows: LineupPlayer[][];
  bench: LineupPlayer[];
}

/** Rank of a position abbreviation along the pitch: 0 keeper ... 5 forward. */
export function positionRank(abbr: string | undefined): number {
  const a = (abbr ?? '').toUpperCase();
  if (a === 'G' || a === 'GK') return 0;
  if (/^(CD|SW|CB|[LR]?B$|[LR]WB)/.test(a)) return 1;
  if (/^DM/.test(a)) return 2;
  if (/^(CM|[LR]M)/.test(a)) return 3;
  if (/^AM/.test(a)) return 4;
  return 5;
}

/** -1 left, 0 centre, 1 right (from the team's own perspective looking up the pitch). */
export function positionSide(abbr: string | undefined): number {
  const a = (abbr ?? '').toUpperCase();
  if (/^L/.test(a) || /-L$/.test(a)) return -1;
  if (/^R/.test(a) || /-R$/.test(a)) return 1;
  return 0;
}

const toPlayer = (r: RawRosterEntry): LineupPlayer => ({
  id: r.athlete?.id ?? `${r.jersey}-${r.athlete?.displayName}`,
  name: r.athlete?.shortName ?? r.athlete?.displayName ?? 'Jugador',
  jersey: r.jersey ?? '',
  position: r.position?.abbreviation ?? '',
  subbedOut: !!r.subbedOut,
  subbedIn: !!r.subbedIn,
});

export function parseLineups(summary: RawSummary): Lineup[] {
  const lineups: Lineup[] = [];
  for (const [i, roster] of (summary.rosters ?? []).entries()) {
    const entries = roster.roster ?? [];
    const starters = entries.filter((r) => r.starter);
    if (starters.length === 0) continue;
    const byRank = new Map<number, LineupPlayer[]>();
    for (const r of starters) {
      const rank = positionRank(r.position?.abbreviation);
      byRank.set(rank, [...(byRank.get(rank) ?? []), toPlayer(r)]);
    }
    const rows = [...byRank.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, players]) =>
        players
          .map((p) => ({ p, side: positionSide(p.position) }))
          .sort((a, b) => a.side - b.side)
          .map((x) => x.p),
      );
    lineups.push({
      side: roster.homeAway ?? (i === 0 ? 'home' : 'away'),
      formation: roster.formation ?? '',
      rows,
      bench: entries.filter((r) => !r.starter).map(toPlayer),
    });
  }
  return lineups;
}
