# Seguimiento de la auditoría 001 (2026-10-11)

Aprobados: 1 a 5 y 10. El resto queda sin tocar.

| # | Cambio | Evidencia |
|---|---|---|
| 1 | `MatchModal.tsx`: flechas, Home y End mueven la selección y el foco entre pestañas; el panel es enfocable con Tab. | Chromium: ArrowRight Resumen → Alineaciones → Estadísticas → Resumen; ArrowLeft, Home y End funcionan; Tab desde la pestaña lleva al panel. |
| 2 | `scoreLabel()` en `lib/match.ts`, usado por `Scoreboard`, `MatchRow` y `FeaturedMatch`. | Etiqueta: "Arsenal contra Leeds United, 2 a 1, final. Ver detalle". |
| 3 | Token `--side-away-ink`: `#06110c` en tema oscuro (6.93:1), `#fff` en tema claro (4.7:1). | Estilo calculado: `rgb(6, 17, 12)` sobre `rgb(91, 155, 255)`. |
| 4 | `pollStartAt()`: el polling empieza en el próximo inicio de partido, no solo si ya había uno en vivo. `useNow` avanza cada 30 s cuando no hay partidos en vivo. | Tests nuevos en `match.test.ts`. El paso real de "programado" a "en vivo" no se observó en el navegador. |
| 5 | `.chip`, `.icon-btn`, `.btn`, `.btn--small`, `.status-tabs button` y `.segmented button` pasan a 44px. | A 360px no queda ningún control menor a 44px; sin overflow horizontal. |
| 10 | `framer-motion` desinstalado. | `npm uninstall`; el build sigue pasando. |

Lint, 86 tests y build: OK.

## Segunda ronda: 6 a 9 y 11 a 16

| # | Cambio | Evidencia |
|---|---|---|
| 6 | "Todas las ligas" usa `LayoutGrid`; ✕ ⇄ ▲ ▼ pasan a Lucide (`X`, `ArrowLeftRight`, `ArrowUp`, `ArrowDown`). Regla: Lucide para la interfaz, CSS solo para tarjetas y pelota. "Entra"/"Sale" pasan a texto `sr-only` (antes era `aria-label` sobre un `span`). | Chromium: ícono SVG en el menú y en los cambios de la línea de tiempo. |
| 7 | `days` y `todayKey` se derivan de `now` (que avanza cada 30 s o cada 1 s), así que "Hoy" cambia a medianoche. | Lint y build. El cambio de día no se observó en vivo. |
| 8 | `role="alert"` en el error de `Standings`. | Lectura del código. |
| 9 | `DESIGN.md` transcribe la dirección que ya existía en el código y declara los diales ENERGY 2 / RHYTHM 1 / MOTION 1. | Archivo nuevo. |
| 11 | Se quitaron `Match.phase` y `season`/`series` de `RawEvent`. | `tsc -b` OK. |
| 12 | Se quitaron `wins/draws/losses/goalsFor/goalsAgainst` de `StandingTeam` y del test. | Tests OK; la tabla sigue con 30 filas. |
| 13 | `useMatches` devuelve `hasLive`; `App` ya no lo recalcula. | Lint y build. |
| 14 | El tema inicial se lee de `document.documentElement.dataset.theme`; se borró `initialTheme()`. | Cambio a claro, recarga: sigue claro y el botón dice "Tema oscuro". |
| 15 | Componente `Scorers`; `EVENT_ICON` pasa a `EVENT_GLYPH`, que solo tiene los tipos de evento con ícono. | Goleadores en el modal: "Riccardo Calafiori 62'", "Bruno Guimarães 70'", "James Justin 55'". |
| 16 | El comentario histórico de `summary.ts` ahora solo dice que `boxscore.statistics` no existe. | Lectura del código. |

Lint, 86 tests y build: OK.
