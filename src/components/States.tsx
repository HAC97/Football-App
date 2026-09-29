import { CalendarX, WifiOff } from 'lucide-react';

export function MatchesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando partidos">
      <div className="skeleton skeleton--hero" />
      <div className="skeleton skeleton--strip" />
      {[0, 1].map((g) => (
        <div key={g} className="group">
          <div className="skeleton skeleton--title" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton-row">
              <span />
              <span />
              <span className="skeleton-row__score" />
              <span />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="state" role="alert">
      <WifiOff size={28} aria-hidden="true" />
      <h2>No pudimos cargar los partidos</h2>
      <p>El servicio de resultados no respondió. Revisá tu conexión e intentá de nuevo.</p>
      <button className="btn btn--primary" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}

export function EmptyDay({ onToday, isToday, filtered }: { onToday: () => void; isToday: boolean; filtered: boolean }) {
  return (
    <div className="state">
      <CalendarX size={28} aria-hidden="true" />
      <h2>{filtered ? 'Sin partidos con este filtro' : 'No hay partidos este día'}</h2>
      <p>{filtered ? 'Probá con otro estado o con todas las ligas.' : 'Elegí otro día en la tira de fechas.'}</p>
      {!isToday && (
        <button className="btn" onClick={onToday}>
          Volver a hoy
        </button>
      )}
    </div>
  );
}
