import { useState, type CSSProperties } from 'react';
import type { LeagueMeta, League, Team } from '../types';

export function Crest({ team, size = 28 }: { team: Team; size?: number }) {
  const [failed, setFailed] = useState(false);
  const style = { '--s': `${size}px` } as CSSProperties;
  if (!team.logo || failed) {
    return (
      <span className="crest crest--fallback" style={style} aria-hidden="true">
        {team.shortName.slice(0, 3)}
      </span>
    );
  }
  return <img className="crest" style={style} src={team.logo} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

/**
 * League emblem. ESPN's "default" logos are often white, so the dark-background variant is always used,
 * on a dark chip in the light theme (see .league-logo in app.css). A bare transparent PNG vanishes in one theme.
 */
export function LeagueLogo({ league, meta, size = 22 }: { league: League; meta?: LeagueMeta; size?: number }) {
  const style = { '--s': `${size}px` } as CSSProperties;
  if (!meta?.logo) {
    return (
      <span className="league-logo league-logo--fallback" style={{ ...style, '--c': league.color } as CSSProperties} aria-hidden="true">
        {league.glyph}
      </span>
    );
  }
  return (
    <span className="league-logo league-logo--img" style={style} aria-hidden="true">
      <img src={meta.logoDark ?? meta.logo} alt="" loading="lazy" />
    </span>
  );
}
