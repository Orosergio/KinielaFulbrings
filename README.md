# Kiniela Mundial 2026

Aplicación multiusuario para organizar quinielas privadas del Mundial 2026.

## Arquitectura

- React, TypeScript y Vite para la interfaz.
- Netlify Identity para registro, acceso y recuperación de cuentas.
- Netlify Functions para autorización y reglas del juego.
- Neon PostgreSQL para perfiles, grupos, membresías, partidos y predicciones.
- `worldcup26.ir` como proveedor público de marcadores.
- `football-data.org` como proveedor alternativo configurable.

GitHub Pages ya no es el destino correcto: una aplicación con cuentas y datos
compartidos necesita funciones de servidor. GitHub conserva el código y ejecuta
CI; Netlify construye y publica la aplicación.

## Reglas de seguridad

- Una predicción solo puede escribirse antes de `matches.kickoff_at`.
- La fecha límite se valida en React, en la Function y en un trigger de PostgreSQL.
- Los picks de otros miembros son visibles dentro del mismo grupo para transparencia.
- Solo miembros del mismo grupo pueden consultar su tabla.
- Los puntos se calculan en PostgreSQL al finalizar el partido.
- La sección "Mi grupo" muestra las reglas de puntos, cobertura del proveedor de
  marcadores y el dashboard completo del grupo.

Puntuación: 7 por marcador exacto, 4 por signo y un gol exacto, 3 por signo,
1 por un gol exacto.

## Desarrollo

```bash
npm install
npm run check
npm test
npm run build
```

Netlify Identity requiere un deploy para probar el acceso real. Para revisar la
interfaz sin backend:

```bash
$env:VITE_DEMO_MODE="true"
npm run dev
```

## Base de datos

1. Crea un proyecto Neon separado para Kiniela.
2. Copia `.env.example` como `.env` y define `DATABASE_URL`.
3. Ejecuta:

```bash
npm run db:migrate
npm run db:seed
```

Las migraciones incrementales están en `db/migrations`.

## Netlify

Variables requeridas:

- `DATABASE_URL`: conexión pooled de Neon.
- `FOOTBALL_DATA_API_TOKEN`: opcional; si existe, usa `football-data.org` en
  lugar del proveedor público.
- `SYNC_SECRET`: opcional; habilita una invocación manual protegida de la
  función programada.

Configuración:

- Build: `npm run build`
- Publish: `dist`
- Functions: `netlify/functions`
- Sincronización: cada 2 minutos en producción.
- Salud: `GET /api/health` valida conexión, cobertura de 104 partidos,
  actualidad del proveedor e integridad de puntos.
- Monitoreo: GitHub Actions consulta producción cada 5 minutos.

Después del primer deploy, habilita Identity y decide si el registro será
abierto o solo por invitación. Para un grupo privado se recomienda invitación o
confirmación de correo obligatoria.
