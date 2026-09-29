import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ListOrdered, RotateCw } from 'lucide-react';
import { LeagueChips, LeagueNav } from './components/LeagueNav';
import { DayStrip } from './components/DayStrip';
import { FeaturedMatch } from './components/FeaturedMatch';
import { LeagueGroup } from './components/LeagueGroup';
import { MatchModal } from './components/MatchModal';
import { Standings } from './components/Standings';
import { EmptyDay, ErrorState, MatchesSkeleton } from './components/States';
import { leagueById, leagues } from './config/leagues';
import { useMatches } from './hooks/useMatches';
import { useNow } from './hooks/useNow';
import { WINDOW_PAST_DAYS, dayKey, dayWindow, pickDefaultDay } from './lib/date';
import { filterByStatus, groupByLeague, pickFeatured, type StatusFilter } from './lib/match';

type Theme = 'dark' | 'light';
type MobileView = 'matches' | 'table';

const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      /* storage can be blocked; the choice just won't persist */
    }
  },
};

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'Todos' },
  { id: 'LIVE', label: 'En vivo' },
  { id: 'SCHEDULED', label: 'Próximos' },
  { id: 'FINISHED', label: 'Finalizados' },
];

function initialTheme(): Theme {
  const saved = store.get('fulltime-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function App() {
  const { matches, meta, loading, error, failed, reload } = useMatches();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [activeLeague, setActiveLeague] = useState<string | null>(() => {
    const saved = store.get('fulltime-league');
    return saved && leagueById(saved) ? saved : null;
  });
  const [standingsPick, setStandingsPick] = useState<string | null>(null);
  const [days] = useState(() => dayWindow(new Date()));
  const todayKey = dayKey(days[WINDOW_PAST_DAYS]);
  const [pickedDay, setSelectedDay] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [view, setView] = useState<MobileView>('matches');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Persist only an explicit choice; otherwise the first system-derived theme would stick forever.
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    store.set('fulltime-theme', next);
  };

  const selectLeague = useCallback((id: string | null) => {
    setActiveLeague(id);
    setStandingsPick(null);
    store.set('fulltime-league', id);
  }, []);

  const byLeague = useMemo(() => (activeLeague ? matches.filter((m) => m.leagueId === activeLeague) : matches), [matches, activeLeague]);
  const hasLive = useMemo(() => matches.some((m) => m.status === 'LIVE'), [matches]);
  const now = useNow(hasLive);

  const liveByLeague = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of matches) if (m.status === 'LIVE') out[m.leagueId] = (out[m.leagueId] ?? 0) + 1;
    return out;
  }, [matches]);

  const dayCounts = useMemo(() => {
    const out: Record<string, { total: number; live: number }> = {};
    for (const m of byLeague) {
      const k = dayKey(m.date);
      const c = (out[k] ??= { total: 0, live: 0 });
      c.total += 1;
      if (m.status === 'LIVE') c.live += 1;
    }
    return out;
  }, [byLeague]);

  const windowKeys = useMemo(() => new Set(days.map(dayKey)), [days]);
  const selectedDay = pickedDay ?? pickDefaultDay(Object.keys(dayCounts).filter((k) => windowKeys.has(k)), todayKey);
  const ofDay = useMemo(() => byLeague.filter((m) => dayKey(m.date) === selectedDay), [byLeague, selectedDay]);
  const statusCounts = useMemo(
    () => ({ ALL: ofDay.length, LIVE: ofDay.filter((m) => m.status === 'LIVE').length, SCHEDULED: ofDay.filter((m) => m.status === 'SCHEDULED').length, FINISHED: ofDay.filter((m) => m.status === 'FINISHED').length }),
    [ofDay],
  );
  const groups = useMemo(() => groupByLeague(filterByStatus(ofDay, status), leagues), [ofDay, status]);

  // The hero follows the selected day, so it always matches a row in the list below it.
  const featured = useMemo(() => pickFeatured(ofDay.length > 0 ? ofDay : byLeague, now), [ofDay, byLeague, now]);
  const featuredLeague = featured ? leagueById(featured.leagueId) : undefined;
  const opened = openId ? matches.find((m) => m.id === openId) : undefined;
  const openedLeague = opened ? leagueById(opened.leagueId) : undefined;
  const standingsLeague = standingsPick ?? activeLeague ?? featured?.leagueId ?? leagues[0].id;

  return (
    <div className="shell" data-view={view}>
      <aside className="shell__nav">
        <LeagueNav leagues={leagues} meta={meta} active={activeLeague} liveByLeague={liveByLeague} onSelect={selectLeague} theme={theme} onToggleTheme={toggleTheme} />
      </aside>

      <LeagueChips leagues={leagues} meta={meta} active={activeLeague} onSelect={selectLeague} theme={theme} onToggleTheme={toggleTheme} />

      <main className="shell__main" id="partidos">
        <h1 className="sr-only">Partidos de fútbol</h1>

        {loading && <MatchesSkeleton />}
        {error && <ErrorState onRetry={reload} />}

        {!loading && !error && (
          <>
            {failed.length > 0 && (
              <div className="notice" role="status">
                <span>No se pudieron cargar: {failed.map((id) => leagueById(id)?.name).join(', ')}.</span>
                <button className="btn btn--small" onClick={reload}>
                  <RotateCw size={14} aria-hidden="true" /> Reintentar
                </button>
              </div>
            )}

            {featured && featuredLeague && <FeaturedMatch match={featured} league={featuredLeague} now={now} onOpen={(m) => setOpenId(m.id)} />}

            <div className="toolbar">
              <DayStrip days={days} selected={selectedDay} onSelect={setSelectedDay} counts={dayCounts} />
              <div className="status-tabs" role="group" aria-label="Filtrar por estado">
                {STATUS_TABS.map((t) => (
                  <button key={t.id} aria-pressed={status === t.id} onClick={() => setStatus(t.id)}>
                    {t.label}
                    <span className="status-tabs__n">{statusCounts[t.id]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="groups">
              {groups.length === 0 ? (
                <EmptyDay filtered={statusCounts.ALL > 0} isToday={selectedDay === todayKey} onToday={() => setSelectedDay(todayKey)} />
              ) : (
                groups.map((g) => <LeagueGroup key={g.league.id} group={g} meta={meta[g.league.id]} now={now} onOpen={(m) => setOpenId(m.id)} />)
              )}
            </div>
          </>
        )}
      </main>

      <aside className="shell__side">
        <Standings leagues={leagues} meta={meta} leagueId={standingsLeague} onPick={setStandingsPick} />
      </aside>

      <nav className="tabbar" aria-label="Secciones">
        <button aria-pressed={view === 'matches'} onClick={() => setView('matches')}>
          <CalendarDays size={20} aria-hidden="true" />
          Partidos
        </button>
        <button aria-pressed={view === 'table'} onClick={() => setView('table')}>
          <ListOrdered size={20} aria-hidden="true" />
          Tabla
        </button>
      </nav>

      {opened && openedLeague && <MatchModal key={opened.id} match={opened} league={openedLeague} meta={meta[openedLeague.id]} now={now} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export default App;
