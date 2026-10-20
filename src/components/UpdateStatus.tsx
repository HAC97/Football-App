import { TriangleAlert } from 'lucide-react';
import { ageLabel } from '../lib/match';

interface Props {
  lastUpdated: number;
  /** Polls in a row that got nothing back. */
  failures: number;
  /** A match is live, so the age of the data matters. */
  live: boolean;
  now: number;
}

/** From the second miss (about a minute without news) the data is called out as stale; before that a live age is enough. */
export const STALE_FAILURES = 2;

export function UpdateStatus({ lastUpdated, failures, live, now }: Props) {
  const age = ageLabel(now - lastUpdated);

  if (failures >= STALE_FAILURES) {
    return (
      <div className="notice" role="status">
        <span>
          <TriangleAlert size={14} aria-hidden="true" /> No se pudo actualizar. Los datos son de hace {age}. Seguimos intentando.
        </span>
      </div>
    );
  }
  if (!live) return null;
  return <p className="updated">Actualizado hace {age}</p>;
}
