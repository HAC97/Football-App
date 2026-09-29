import { useEffect, useRef } from 'react';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { dayKey } from '../lib/date';

interface Props {
  days: Date[];
  selected: string;
  onSelect: (key: string) => void;
  counts: Record<string, { total: number; live: number }>;
}

export function DayStrip({ days, selected, onSelect, counts }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);

  // Center the selected day inside the strip itself (scrollIntoView would also scroll the page).
  useEffect(() => {
    const strip = stripRef.current;
    const button = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!strip || !button) return;
    strip.scrollTo({ left: button.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2, behavior: 'auto' });
  }, [selected]);

  return (
    <div ref={stripRef} className="days" role="group" aria-label="Elegir día">
      {days.map((d) => {
        const key = dayKey(d);
        const c = counts[key];
        const active = key === selected;
        return (
          <button
            key={key}
            className="day"
            aria-pressed={active}
            aria-current={isToday(d) ? 'date' : undefined}
            onClick={() => onSelect(key)}
            aria-label={`${format(d, "EEEE d 'de' MMMM", { locale: es })}${c?.live ? `, ${c.live} en vivo` : c?.total ? `, ${c.total} partidos` : ', sin partidos'}`}
          >
            <span className="day__dow">{isToday(d) ? 'Hoy' : format(d, 'EEE', { locale: es }).replace('.', '')}</span>
            <span className="day__num">{format(d, 'd')}</span>
            <span className="day__mark" data-live={c?.live ? 'true' : undefined} data-has={c?.total ? 'true' : undefined} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
