import { format, formatDistanceStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin } from 'lucide-react';
import { Crest } from './Crest';
import { Scoreboard } from './Scoreboard';
import { statusText } from '../lib/match';
import { capitalize } from '../lib/date';
import type { League, Match } from '../types';

interface Props {
  match: Match;
  league: League;
  now: number;
  onOpen: (match: Match) => void;
}

function Pitch() {
  return (
    <svg className="featured__pitch" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="20" y="20" width="760" height="260" rx="6" />
        <line x1="400" y1="20" x2="400" y2="280" />
        <circle cx="400" cy="150" r="52" />
        <circle cx="400" cy="150" r="3" fill="currentColor" />
        <rect x="20" y="85" width="92" height="130" />
        <rect x="20" y="118" width="34" height="64" />
        <rect x="688" y="85" width="92" height="130" />
        <rect x="746" y="118" width="34" height="64" />
      </g>
    </svg>
  );
}

export function FeaturedMatch({ match, league, now, onOpen }: Props) {
  const live = match.status === 'LIVE';
  const kickoff = new Date(match.date);
  const eyebrow = live ? 'En vivo ahora' : match.status === 'SCHEDULED' ? 'Próximo partido' : 'Último resultado';
  const note =
    match.status === 'SCHEDULED'
      ? kickoff.getTime() > now
        ? `Empieza en ${formatDistanceStrict(kickoff, now, { locale: es })}`
        : 'Por comenzar'
      : statusText(match, now);

  return (
    <button className="featured" data-live={live || undefined} onClick={() => onOpen(match)} aria-label={`Partido destacado: ${match.homeTeam.name} contra ${match.awayTeam.name}. Ver detalle`}>
      <Pitch />
      <span className="featured__top">
        <span className={live ? 'live-pill' : 'featured__eyebrow'}>
          {live && <span className="live-dot" aria-hidden="true" />}
          {eyebrow}
        </span>
        <span className="featured__league">{league.name}</span>
      </span>

      <span className="featured__stage">
        <span className="featured__team">
          <Crest team={match.homeTeam} size={72} />
          <span className="featured__name">{match.homeTeam.name}</span>
        </span>

        <span className="featured__center">
          {match.status === 'SCHEDULED' ? (
            <span className="featured__kickoff">{format(kickoff, 'HH:mm')}</span>
          ) : (
            <Scoreboard match={match} size="lg" />
          )}
          <span className="featured__note">{note}</span>
        </span>

        <span className="featured__team">
          <Crest team={match.awayTeam} size={72} />
          <span className="featured__name">{match.awayTeam.name}</span>
        </span>
      </span>

      <span className="featured__foot">
        <span>{capitalize(format(kickoff, "EEEE d 'de' MMMM", { locale: es }))}</span>
        {match.venue && (
          <span className="featured__venue">
            <MapPin size={14} aria-hidden="true" />
            {match.venue}
          </span>
        )}
      </span>
    </button>
  );
}
