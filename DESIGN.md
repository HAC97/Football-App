# Fulltime: dirección de diseño

Este documento transcribe decisiones que ya están en el código (`src/styles/base.css`, `Scoreboard.tsx`). No agrega una dirección nueva: si cambia el diseño, se actualiza acá.

Lectura: app de resultados de fútbol para hinchas que la abren varias veces por día, con lenguaje de estadio (marcador electrónico, cancha, cartelería). Diales: ENERGY 2 / RHYTHM 1 / MOTION 1.

## Diales

- **ENERGY 2**: el partido destacado (cancha dibujada, marcador grande) y los titulares en tipografía condensada dan presencia; el resto es una lista de datos tranquila.
- **RHYTHM 1**: uniforme a propósito. Es una lista de partidos agrupada por liga; la previsibilidad ayuda a escanear resultados.
- **MOTION 1**: solo hover, el pulso del punto "en vivo", el shimmer de carga y la entrada del modal. Todo se apaga con `prefers-reduced-motion`.

## Decisiones y por qué

| Decisión | Por qué |
|---|---|
| Interfaz monocroma; el color se reserva para significados | El color tiene que decir algo: ámbar = dígitos del marcador, rojo (`--live`) = en vivo, verde (`--turf`) = victoria o clasificación. |
| Marcador de dígitos ámbar sobre placas oscuras (`Scoreboard`) | Es el motivo de identidad: el tablero electrónico del estadio. Se repite en filas, destacado, modal y línea de tiempo. |
| Big Shoulders Display para titulares y dígitos | Condensada, como la cartelería de estadio; entran nombres largos de equipos en poco ancho. |
| Instrument Sans para el texto | Legible en tamaños chicos (tablas, minutos, etiquetas). |
| Tema oscuro y claro, con el del sistema por defecto | Se usa de día y de noche; la elección del usuario se recuerda. |
| Colores de zona de ESPN en la tabla, con leyenda | Son los que el hincha ya conoce; la franja de color siempre tiene su referencia escrita. |
| Íconos: Lucide para la interfaz; tarjetas y pelota dibujadas en CSS | Lucide no tiene pictogramas de fútbol. No se usan caracteres Unicode como íconos. |
| Áreas táctiles de 44px como mínimo | Se usa mucho en el celular, con una mano. |
| Contraste AA en los dos temas | Incluye los números de camiseta sobre el color de cada equipo (`--side-away-ink`). |
