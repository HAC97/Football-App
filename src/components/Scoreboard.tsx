import type { Match } from '../types';
import { isNotPlayed } from '../lib/match';

/** The stadium scoreboard: amber digits on dark tiles. The one signature element of the design. */
export function Scoreboard({ match, size = 'md' }: { match: Match; size?: 'md' | 'lg' }) {
  const { score, penalties } = match;
  if (!score || isNotPlayed(match)) {
    return (
      <span className={`scoreboard scoreboard--${size} scoreboard--idle`} aria-hidden="true">
        <span className="digit">–</span>
        <span className="digit">–</span>
      </span>
    );
  }
  const label = `${score.home} a ${score.away}${penalties ? `, penales ${penalties.home} a ${penalties.away}` : ''}`;
  return (
    <span className={`scoreboard scoreboard--${size}`} data-live={match.status === 'LIVE' ? 'true' : undefined} role="img" aria-label={label}>
      <span className="digit">{score.home}</span>
      <span className="digit">{score.away}</span>
      {penalties && (
        <span className="scoreboard__pens" aria-hidden="true">
          pen. {penalties.home}–{penalties.away}
        </span>
      )}
    </span>
  );
}
