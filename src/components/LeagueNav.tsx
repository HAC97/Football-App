import { Moon, Sun } from 'lucide-react';
import { LeagueLogo } from './Crest';
import type { League, LeagueMeta } from '../types';

interface Props {
  leagues: League[];
  meta: Record<string, LeagueMeta>;
  active: string | null;
  liveByLeague: Record<string, number>;
  onSelect: (id: string | null) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function LeagueNav({ leagues, meta, active, liveByLeague, onSelect, theme, onToggleTheme }: Props) {
  return (
    <nav className="nav" aria-label="Ligas">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true" />
        <span className="brand__name">Fulltime</span>
      </div>

      <ul className="nav__list">
        <li>
          <button className="nav__item" aria-pressed={active === null} onClick={() => onSelect(null)}>
            <span className="league-logo league-logo--fallback league-logo--all" aria-hidden="true">
              ∗
            </span>
            <span className="nav__label">Todas las ligas</span>
          </button>
        </li>
        {leagues.map((l) => (
          <li key={l.id}>
            <button className="nav__item" aria-pressed={active === l.id} onClick={() => onSelect(l.id)}>
              <LeagueLogo league={l} meta={meta[l.id]} />
              <span className="nav__label">
                {l.name}
                <small>{l.country}</small>
              </span>
              {liveByLeague[l.id] ? (
                <span className="nav__live" title={`${liveByLeague[l.id]} en vivo`}>
                  <span className="live-dot" aria-hidden="true" />
                  {liveByLeague[l.id]}
                  <span className="sr-only"> en vivo</span>
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      <button className="theme-toggle" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        <span>{theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>
      </button>
    </nav>
  );
}

/** Horizontal league chips shown instead of the rail on narrow screens. */
export function LeagueChips({ leagues, meta, active, onSelect, theme, onToggleTheme }: Omit<Props, 'liveByLeague'>) {
  return (
    <div className="chips-bar">
      <div className="brand brand--compact">
        <span className="brand__mark" aria-hidden="true" />
        <span className="brand__name">Fulltime</span>
        <button className="icon-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
      <div className="chips" role="group" aria-label="Ligas">
        <button className="chip" aria-pressed={active === null} onClick={() => onSelect(null)}>
          Todas
        </button>
        {leagues.map((l) => (
          <button key={l.id} className="chip" aria-pressed={active === l.id} onClick={() => onSelect(l.id)}>
            <LeagueLogo league={l} meta={meta[l.id]} size={18} />
            {l.name}
          </button>
        ))}
      </div>
    </div>
  );
}
