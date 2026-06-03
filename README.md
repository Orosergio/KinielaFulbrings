# Kiniela Mundial 2026

Sitio estatico para jugar una quiniela del Mundial 2026 en GitHub Pages.

## Que incluye

- Calendario completo de 104 partidos con fase de grupos, ronda de 32, octavos, cuartos, semifinales, tercer puesto y final.
- Banderas, sedes, hora local del estadio y hora local del usuario.
- Marcador en vivo y tablas desde `worldcup26.ir` cuando la API responde.
- Fallback local en `data/worldcup-2026.json` para que la web siga funcionando sin API.
- Participantes, predicciones, puntaje, exportacion e importacion guardados en `localStorage`.
- Grupos locales para separar quinielas, por ejemplo Amigos y Familia.
- Vista por jornada, Pick Focus para mobile y centro de mando social.
- Modo claro/oscuro e idioma español/ingles.
- Modelo de scouting local para comparar equipos, fortalezas, figuras y ratio estimado.

## Puntaje

La regla replica la mecanica del Excel viejo:

- Marcador exacto: 7 puntos.
- Signo correcto y un gol exacto: 4 puntos.
- Signo correcto: 3 puntos.
- Solo un gol exacto: 1 punto.

## Publicar en GitHub Pages

1. Sube este proyecto a un repositorio de GitHub.
2. Ve a `Settings > Pages`.
3. En `Build and deployment`, selecciona `GitHub Actions`.
4. Haz push a `main`; el workflow `.github/workflows/pages.yml` publicara el sitio.

No hay build ni dependencias. GitHub Pages sirve directamente `index.html`, `styles.css`, `app.js` y `data/worldcup-2026.json`.

## Datos

Fuentes usadas:

- FIFA official match schedule: https://www.fifa.com/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums
- API publica: https://worldcup26.ir/
- Repositorio de datos: https://github.com/rezarahiminia/worldcup2026

El sitio intenta refrescar `games` y `groups` desde la API publica. Si falla por CORS, caida de API o conexion, usa el JSON local.

## Flujo de uso

- `Actualizar` solo refresca marcadores y tablas desde la API publica. No borra ni completa predicciones.
- El progreso `X/104` muestra si al jugador activo le falta algun pick.
- `Jornada` agrupa partidos por dia para anotar en contexto.
- `Pick Focus` permite completar un partido a la vez, pensado para telefono.
- `Centro` mantiene proximos partidos, progreso y tabla del grupo en la misma pantalla.
- `Bracket` se actualiza cuando la API ya trae ganadores/equipos definidos; antes muestra los cruces oficiales.

## Nota sobre multiusuario

GitHub Pages no tiene base de datos. Por eso las predicciones se guardan localmente en cada navegador. Puedes crear grupos separados y exportar/importar datos, pero para una tabla compartida real hace falta agregar un backend ligero, por ejemplo Firebase, Supabase o una GitHub Action con formulario protegido.
