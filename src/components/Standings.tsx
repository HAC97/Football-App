import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Crest } from './Crest';
import { LeagueLogo } from './Crest';
import { fetchStandings } from '../services/espn';
import { useFetch } from '../hooks/useFetch';
import type { League, LeagueMeta } from '../types';

interface Props {
  leagues: League[];
  meta: Record<string, LeagueMeta>;
  leagueId: string;
  onPick: (id: string) => void;
}

export function Standings({ leagues, meta, leagueId, onPick }: Props) {
  const league = leagues.find((l) => l.id === leagueId) ?? leagues[0];
  const { data, error, loading, reload } = useFetch(league.id, (signal) => fetchStandings(league, signal));

  const zones = useMemo(() => {
    const seen = new Map<string, string>();
    data?.forEach((g) => g.entries.forEach((e) => e.zone && seen.set(e.zone.description, e.zone.color)));
    return [...seen.entries()];
  }, [data]);

  return (
    <section className="standings" aria-labelledby="standings-title">
      <header className="standings__head">
        <h2 id="standings-title">Posiciones</h2>
        <label className="picker">
          <LeagueLogo league={league} meta={meta[league.id]} size={22} />
          <span className="picker__label">{league.name}</span>
          <span className="sr-only">Liga de la tabla</span>
          <select value={league.id} onChange={(e) => onPick(e.target.value)}>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
      </header>

      {loading && (
        <div className="skeleton-list" aria-busy="true" aria-label="Cargando posiciones">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="skeleton skeleton--line" />
          ))}
        </div>
      )}

      {error && (
        <div className="state state--compact">
          <p>No pudimos cargar la tabla.</p>
          <button className="btn" onClick={reload}>
            Reintentar
          </button>
        </div>
      )}

      {data && data.length === 0 && <p className="state state--compact">Esta competencia no tiene tabla de posiciones.</p>}

      {data?.map((group) => (
        <div key={group.name} className="table-wrap">
          {data.length > 1 && <h3 className="table-group">{group.name}</h3>}
          <table className="table">
            <caption className="sr-only">{`${league.name}: ${group.name}`}</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Equipo</th>
                <th scope="col" title="Partidos jugados">
                  PJ
                </th>
                <th scope="col" title="Diferencia de gol">
                  DG
                </th>
                <th scope="col" title="Puntos">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {group.entries.map((row) => (
                <tr key={row.id}>
                  <td className="table__rank" style={row.zone ? { boxShadow: `inset 3px 0 0 ${row.zone.color}` } : undefined} title={row.zone?.description}>
                    {row.rank}
                  </td>
                  <td>
                    <span className="table__team">
                      <Crest team={row.team} size={20} />
                      <span title={row.team.name}>{row.team.name}</span>
                    </span>
                  </td>
                  <td>{row.played}</td>
                  <td data-sign={Math.sign(row.goalDifference)}>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                  <td className="table__pts">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {zones.length > 0 && (
        <ul className="legend" aria-label="Referencias de la tabla">
          {zones.map(([description, color]) => (
            <li key={description}>
              <span className="legend__swatch" style={{ background: color }} aria-hidden="true" />
              {description}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
