import { format } from 'date-fns';
import { Crest } from './Crest';
import { Scoreboard } from './Scoreboard';
import { isNotPlayed, statusText } from '../lib/match';
import type { Match } from '../types';

interface Props {
  match: Match;
  now: number;
  onOpen: (match: Match) => void;
}

export function MatchRow({ match, now, onOpen }: Props) {
  const live = match.status === 'LIVE';
  const finished = match.status === 'FINISHED' && !isNotPlayed(match);
  const s = match.score;
  const homeWon = finished && !!s && (s.home > s.away || (!!match.penalties && s.home === s.away && match.penalties.home > match.penalties.away));
  const awayWon = finished && !!s && (s.away > s.home || (!!match.penalties && s.home === s.away && match.penalties.away > match.penalties.home));
  const kickoff = format(new Date(match.date), 'HH:mm');

  return (
    <button
      className="row"
      data-status={match.status}
      onClick={() => onOpen(match)}
      aria-label={`${match.homeTeam.name} contra ${match.awayTeam.name}, ${live ? 'en vivo' : match.status === 'FINISHED' ? 'finalizado' : `a las ${kickoff}`}. Ver detalle`}
    >
      <span className="row__status">
        {live ? (
          <span className="live-pill">
            <span className="live-dot" aria-hidden="true" />
            {statusText(match, now)}
          </span>
        ) : match.status === 'SCHEDULED' ? (
          <span className="row__time">{kickoff}</span>
        ) : (
          <span className="row__final">{statusText(match, now)}</span>
        )}
      </span>

      <span className="row__team row__team--home" data-won={homeWon || undefined} data-lost={awayWon || undefined}>
        <span className="row__name">{match.homeTeam.name}</span>
        <Crest team={match.homeTeam} />
      </span>

      {match.status === 'SCHEDULED' ? <span className="row__vs">vs</span> : <Scoreboard match={match} />}

      <span className="row__team row__team--away" data-won={awayWon || undefined} data-lost={homeWon || undefined}>
        <Crest team={match.awayTeam} />
        <span className="row__name">{match.awayTeam.name}</span>
      </span>
    </button>
  );
}
