import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, X } from 'lucide-react';
import { Crest, LeagueLogo } from './Crest';
import { Scoreboard } from './Scoreboard';
import { useFetch } from '../hooks/useFetch';
import { fetchSummary } from '../services/espn';
import { statusText } from '../lib/match';
import { capitalize } from '../lib/date';
import { homeShare, isGoal, parseEvents, parseLineups, parseStats, type Lineup, type RawSummary, type StatRow, type TimelineEvent } from '../lib/summary';
import type { League, LeagueMeta, Match } from '../types';

type Tab = 'resumen' | 'alineaciones' | 'estadisticas';

interface Props {
  match: Match;
  league: League;
  meta?: LeagueMeta;
  now: number;
  onClose: () => void;
}

const EVENT_ICON: Record<TimelineEvent['kind'], string> = {
  goal: '',
  'own-goal': '',
  'penalty-goal': '',
  'penalty-miss': '✕',
  yellow: '',
  red: '',
  sub: '⇄',
  var: 'VAR',
  period: '',
  other: '',
};

const EVENT_LABEL: Record<TimelineEvent['kind'], string> = {
  goal: 'Gol',
  'own-goal': 'Gol en contra',
  'penalty-goal': 'Gol de penal',
  'penalty-miss': 'Penal fallado',
  yellow: 'Tarjeta amarilla',
  red: 'Tarjeta roja',
  sub: 'Cambio',
  var: 'VAR',
  period: '',
  other: '',
};

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="timeline">
      {events.map((e) =>
        e.kind === 'period' ? (
          <li key={e.id} className="timeline__period">
            <span>{e.minute}</span> {e.player}
          </li>
        ) : (
          <li key={e.id} className="timeline__item" data-side={e.side ?? 'none'} data-kind={e.kind}>
            <span className="timeline__body">
              <strong>
                {e.kind === 'sub' && (
                  <span className="sub-in" aria-label="Entra">
                    ▲{' '}
                  </span>
                )}
                {e.player}
                {e.score && <span className="timeline__score">{e.score}</span>}
              </strong>
              {e.kind === 'sub' ? (
                e.detail && (
                  <small className="sub-out">
                    <span aria-label="Sale">▼</span> {e.detail}
                  </small>
                )
              ) : (
                <small>
                  {EVENT_LABEL[e.kind]}
                  {e.detail ? ` · ${e.detail}` : ''}
                </small>
              )}
            </span>
            <span className="timeline__min">
              <span className="timeline__icon" data-kind={e.kind} aria-hidden="true">
                {EVENT_ICON[e.kind]}
              </span>
              {e.minute}
            </span>
          </li>
        ),
      )}
    </ol>
  );
}

function Pitch({ lineup, match }: { lineup: Lineup; match: Match }) {
  const attackFirst = [...lineup.rows].reverse();
  return (
    <div className="pitch" data-side={lineup.side}>
      <svg className="pitch__lines" viewBox="0 0 400 560" preserveAspectRatio="none" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="10" y="10" width="380" height="540" />
          <line x1="10" y1="280" x2="390" y2="280" />
          <circle cx="200" cy="280" r="50" />
          <rect x="100" y="10" width="200" height="80" />
          <rect x="145" y="10" width="110" height="30" />
          <rect x="100" y="470" width="200" height="80" />
          <rect x="145" y="520" width="110" height="30" />
        </g>
      </svg>
      <div className="pitch__rows">
        {attackFirst.map((row, i) => (
          <div key={i} className="pitch__row">
            {row.map((p) => (
              <div key={p.id} className="player" data-out={p.subbedOut || undefined}>
                <span className="player__shirt">{p.jersey}</span>
                <span className="player__name">{p.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">{`Alineación de ${lineup.side === 'home' ? match.homeTeam.name : match.awayTeam.name}`}</span>
    </div>
  );
}

function Lineups({ lineups, match }: { lineups: Lineup[]; match: Match }) {
  const [side, setSide] = useState<'home' | 'away'>('home');
  const lineup = lineups.find((l) => l.side === side) ?? lineups[0];
  return (
    <div className="lineups">
      <div className="segmented" role="group" aria-label="Equipo">
        {(['home', 'away'] as const).map((s) => {
          const team = s === 'home' ? match.homeTeam : match.awayTeam;
          return (
            <button key={s} aria-pressed={lineup.side === s} onClick={() => setSide(s)} disabled={!lineups.some((l) => l.side === s)}>
              <Crest team={team} size={18} />
              <span>{team.name}</span>
            </button>
          );
        })}
      </div>
      <p className="lineups__formation">{lineup.formation ? `Formación ${lineup.formation}` : 'Formación no informada'}</p>
      <Pitch lineup={lineup} match={match} />
      {lineup.bench.length > 0 && (
        <div className="bench">
          <h3>Suplentes</h3>
          <ul>
            {lineup.bench.map((p) => (
              <li key={p.id} data-in={p.subbedIn || undefined}>
                <span className="bench__num">{p.jersey}</span>
                {p.name}
                {p.subbedIn && <small> · ingresó</small>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stats({ rows, match }: { rows: StatRow[]; match: Match }) {
  return (
    <div className="stats">
      <div className="stats__teams">
        <span data-side="home">{match.homeTeam.name}</span>
        <span data-side="away">{match.awayTeam.name}</span>
      </div>
      {rows.map((r) => {
        const share = homeShare(r);
        return (
          <div key={r.key} className="stat">
            <div className="stat__nums">
              <b data-lead={r.home > r.away || undefined}>
                {r.home}
                {r.suffix}
              </b>
              <span>{r.label}</span>
              <b data-lead={r.away > r.home || undefined}>
                {r.away}
                {r.suffix}
              </b>
            </div>
            <div className="stat__bar" aria-hidden="true">
              {r.home + r.away > 0 && (
                <>
                  <span style={{ width: `${share}%`, opacity: r.home < r.away ? 0.6 : 1 }} />
                  <span style={{ width: `${100 - share}%`, opacity: r.away < r.home ? 0.6 : 1 }} />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MatchModal({ match, league, meta, now, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data, error, loading, reload } = useFetch<RawSummary>(match.id, (signal) => fetchSummary<RawSummary>(match, signal));
  const [picked, setPicked] = useState<Tab | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const events = useMemo(() => (data ? parseEvents(data, match) : []), [data, match]);
  const lineups = useMemo(() => (data ? parseLineups(data) : []), [data]);
  const stats = useMemo(() => (data ? parseStats(data) : []), [data]);

  const tabs = ([
    events.length > 0 && { id: 'resumen', label: 'Resumen' },
    lineups.length > 0 && { id: 'alineaciones', label: 'Alineaciones' },
    stats.length > 0 && { id: 'estadisticas', label: 'Estadísticas' },
  ].filter(Boolean)) as { id: Tab; label: string }[];
  const tab = tabs.find((t) => t.id === picked)?.id ?? tabs[0]?.id;

  const goals = (side: 'home' | 'away') => events.filter((e) => e.side === side && isGoal(e));
  const kickoff = new Date(match.date);

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose} onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()} aria-labelledby="modal-title">
      <div className="modal__panel">
        <header className="modal__head">
          <div className="modal__meta">
            <LeagueLogo league={league} meta={meta} size={20} />
            <span>{league.name}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={match.date}>{capitalize(format(kickoff, 'EEE d MMM, HH:mm', { locale: es }))}</time>
          </div>
          <button className="icon-btn" onClick={() => dialogRef.current?.close()} aria-label="Cerrar detalle">
            <X size={20} />
          </button>
        </header>

        <div className="modal__score">
          <div className="modal__team">
            <Crest team={match.homeTeam} size={64} />
            <h2 id="modal-title">
              {match.homeTeam.name} <span className="sr-only">contra {match.awayTeam.name}</span>
            </h2>
            <ul className="scorers">
              {goals('home').map((g) => (
                <li key={g.id}>
                  {g.player}
                  {g.kind === 'own-goal' ? ' (e/c)' : g.kind === 'penalty-goal' ? ' (p)' : ''} {g.minute}
                </li>
              ))}
            </ul>
          </div>
          <div className="modal__center">
            {match.status === 'SCHEDULED' ? <span className="modal__kickoff">{format(kickoff, 'HH:mm')}</span> : <Scoreboard match={match} size="lg" />}
            <span className="modal__status" data-live={match.status === 'LIVE' || undefined}>
              {match.status === 'LIVE' && <span className="live-dot" aria-hidden="true" />}
              {statusText(match, now)}
            </span>
          </div>
          <div className="modal__team">
            <Crest team={match.awayTeam} size={64} />
            <h2>{match.awayTeam.name}</h2>
            <ul className="scorers">
              {goals('away').map((g) => (
                <li key={g.id}>
                  {g.player}
                  {g.kind === 'own-goal' ? ' (e/c)' : g.kind === 'penalty-goal' ? ' (p)' : ''} {g.minute}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {match.venue && (
          <p className="modal__venue">
            <MapPin size={14} aria-hidden="true" />
            {match.venue}
          </p>
        )}

        <div className="modal__body">
          {loading && (
            <div className="skeleton-list" aria-busy="true" aria-label="Cargando detalle">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton skeleton--line" />
              ))}
            </div>
          )}

          {error && (
            <div className="state state--compact" role="alert">
              <p>No pudimos cargar el detalle del partido.</p>
              <button className="btn" onClick={reload}>
                Reintentar
              </button>
            </div>
          )}

          {data && !tab && (
            <p className="state state--compact">
              {match.status === 'SCHEDULED' ? 'Las alineaciones y estadísticas aparecen cuando se acerca el partido.' : 'Todavía no hay datos de este partido.'}
            </p>
          )}

          {tab && (
            <>
              <div className="tabs" role="tablist" aria-label="Detalle del partido">
                {tabs.map((t) => (
                  <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="tabpanel" tabIndex={tab === t.id ? 0 : -1} onClick={() => setPicked(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div id="tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
                {tab === 'resumen' && <Timeline events={events} />}
                {tab === 'alineaciones' && <Lineups lineups={lineups} match={match} />}
                {tab === 'estadisticas' && <Stats rows={stats} match={match} />}
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
