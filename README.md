# Fulltime

Resultados, partidos en vivo, alineaciones, estadísticas y tablas de posiciones de seis competencias:
Liga Profesional (Argentina), Premier League, Serie A, LaLiga, Copa Libertadores, Copa Sudamericana y Champions League.
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
| `npm test` | Tests unitarios y de interfaz (jsdom + Testing Library, offline, ~5 s) |
| `npm run eval` | Evals contra la API real de ESPN (necesita red, ~15 s) |

## Qué hace la app

- **Partido destacado**: el que está en vivo; si no hay, el próximo; si no, el último resultado.
- **Tira de días** (7 atrás, 14 adelante) con punto en los días con partidos y punto rojo si hay uno en vivo. Al abrir, elige hoy o el día más cercano con partidos.
- **Filtros** por liga y por estado (en vivo, próximos, finalizados). La liga y el tema se recuerdan.
- **Vista en la URL**: `?liga=pl&dia=2026-10-18&estado=vivo&partido=401234`. Se puede compartir un partido, y el botón Atrás cierra el detalle. Los valores inválidos se ignoran; si la URL no trae liga, se usa la recordada en el dispositivo. Un `partido` que ESPN no devuelve en la ventana cargada se descarta.
- **Reloj en vivo** que avanza cada segundo entre consultas; consulta solo los partidos de hoy cada 30 s, desde el próximo inicio o mientras haya algo en vivo, y solo con la pestaña visible. Muestra "Actualizado hace X s" mientras hay algo en vivo; si las consultas fallan, reintenta cada vez más espaciado (30 s, 60 s, 2 min, hasta 5 min) y desde el segundo fallo avisa que los datos están desactualizados.
- **Arranque instantáneo**: la última respuesta de ESPN se guarda en `localStorage` (hasta 2 h) y pinta la primera pantalla mientras se consulta la red. Si la red cae, se sigue viendo lo guardado con su antigüedad real. Nunca se sobrescribe con una respuesta vacía.
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
  test/                 setup de jsdom para los tests de interfaz (polyfill de <dialog>)
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

**Pre-commit**: `npm install` activa el hook de `.githooks/` (vía `core.hooksPath`). En cada commit corre, según los archivos en stage: ESLint sobre los `.ts/.tsx` (sin avisos), `tsc -b`, y los tests relacionados con ellos (la suite completa si cambia `package.json`, `vite.config.ts`, los `tsconfig`, `eslint.config.js`, `src/test/` o `scripts/`). Tarda unos 6 s con código y casi nada con solo documentos. Si falla, arregla el problema; no uses `--no-verify`. El hook revisa el árbol de trabajo, no el contenido exacto del índice, así que un `git add -p` parcial puede colar código sin revisar.

CI (`.github/workflows/ci.yml`): en cada PR y push a `main` corre `lint`, `test` y `build`. Los evals contra ESPN corren cada noche (03:00 UTC) y a mano desde la pestaña Actions; no bloquean PRs porque dependen de la red.
