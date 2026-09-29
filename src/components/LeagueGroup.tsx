import { LeagueLogo } from './Crest';
import { MatchRow } from './MatchRow';
import type { LeagueGroup as Group } from '../lib/match';
import type { LeagueMeta, Match } from '../types';

interface Props {
  group: Group;
  meta?: LeagueMeta;
  now: number;
  onOpen: (match: Match) => void;
}

export function LeagueGroup({ group, meta, now, onOpen }: Props) {
  const { league, matches } = group;
  const live = matches.filter((m) => m.status === 'LIVE').length;
  return (
    <section className="group" aria-labelledby={`g-${league.id}`}>
      <header className="group__head">
        <LeagueLogo league={league} meta={meta} size={24} />
        <h2 id={`g-${league.id}`}>{league.name}</h2>
        <span className="group__country">{league.country}</span>
        {live > 0 && (
          <span className="group__live">
            <span className="live-dot" aria-hidden="true" />
            {live} en vivo
          </span>
        )}
      </header>
      <div className="group__rows">
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} now={now} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
