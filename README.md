# Fulltime

Resultados, partidos en vivo, alineaciones, estadísticas y tablas de posiciones de seis competencias:
Liga Profesional (Argentina), Premier League, Serie A, LaLiga, Copa Libertadores y Champions League.
Los datos vienen de la API pública de ESPN, sin clave ni backend.

React 19 + TypeScript + Vite. Sin librería de UI: CSS propio con tokens (tema oscuro y claro).

## Uso

```bash
npm install
npm run dev
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequeo de tipos y build de producción |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios (offline, ~1 s) |
| `npm run eval` | Evals contra la API real de ESPN (necesita red, ~15 s) |

## Qué hace la app

- **Partido destacado**: el que está en vivo; si no hay, el próximo; si no, el último resultado.
- **Tira de días** (7 atrás, 14 adelante) con punto en los días con partidos y punto rojo si hay uno en vivo. Al abrir, elige hoy o el día más cercano con partidos.
- **Filtros** por liga y por estado (en vivo, próximos, finalizados). La liga y el tema se recuerdan.
- **Reloj en vivo** que avanza cada segundo entre consultas; consulta solo los partidos de hoy cada 30 s y solo mientras haya algo en vivo y la pestaña esté visible.
- **Detalle del partido**: resumen con goles, tarjetas y cambios; alineaciones dibujadas en la cancha con suplentes; estadísticas comparadas.
- **Posiciones** con zonas de clasificación (colores de ESPN) y grupos donde corresponde.
- **Móvil**: chips de ligas arriba y pestañas Partidos / Tabla abajo.

## Estructura

```
src/
  config/leagues.ts     ligas y sus slugs de ESPN
  services/espn.ts      cliente de ESPN: tipos crudos, normalizadores y fetch
  lib/                  lógica pura y testeada: fechas, estado del partido, resumen/alineaciones
  hooks/                useMatches (carga + polling), useFetch (sin respuestas viejas), useNow
  components/           UI
  styles/               base.css (tokens) y app.css
  __fixtures__/         respuestas reales de ESPN recortadas, usadas por los tests
evals/espn.eval.ts      contrato contra la API real
```

## Notas sobre la API de ESPN

- **Los rangos de fechas (`dates=YYYYMMDD-YYYYMMDD`) responden HTTP 400.** La app consulta por mes (`dates=YYYYMM`)
  y filtra por día en el cliente. `npm run eval` detecta si esto cambia.
- Las estadísticas están en `boxscore.teams[].statistics` (una lista por equipo), no en `boxscore.statistics`.
- Cada liga trae dos logos (claro y oscuro); la app muestra el que corresponde al tema.

## Antes de publicar

```bash
npm run lint && npm test && npm run build && npm run eval
```
