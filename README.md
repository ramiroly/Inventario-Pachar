# Sistema de Inventario — Destilería Pachar

Reemplaza el flujo de Excel semanal + dashboards HTML manuales por un sistema web con login,
carga de movimientos de stock, y generación bajo demanda de los mismos dashboards interactivos.
Ver la especificación completa en `especificacion_sistema_inventario.md` (spec original del proyecto).

## Estado de este scaffold

Modelo de datos + backend con los cálculos ya validados (Fases 1-2 de la spec), ya con datos
reales cargados: colores por línea, los 25 SKUs de terminados, los 28 tanques de líquidos con
sus capacidades reales, y el corte de stock al 01/09/2026 (ver `backend/src/db/seed/`).
Todavía falta: la réplica visual exacta de los 3 dashboards históricos (por ahora el frontend
tiene páginas placeholder que consumen la misma API) y el formulario de carga completo.

## Stack

- **Backend:** Node.js + Express + TypeScript, cliente `@supabase/supabase-js` con la service role key.
- **Frontend:** React + Vite + TypeScript, Chart.js, cliente Supabase con la anon key (auth).
- **Base de datos:** PostgreSQL vía Supabase (incluye Auth).
- **Monorepo:** npm workspaces (`backend/`, `frontend/`).

## Requisitos

- Node.js 20+ y npm 10+ (no estaban instalados al generar este scaffold — instalar antes de continuar).
- Una cuenta y proyecto en [supabase.com](https://supabase.com) (plan gratuito alcanza para este volumen).

## Setup

1. **Instalar dependencias** (desde la raíz):
   ```bash
   npm install
   ```

2. **Crear el proyecto en Supabase** y, en el dashboard, ir a *SQL Editor* y correr en orden
   los archivos de `backend/src/db/migrations/` (001 a 007), y luego los de
   `backend/src/db/seed/` en este orden (cada uno depende del anterior por llaves foráneas):
   `seed_lineas.sql` → `seed_productos_terminados.sql` → `seed_tanques_liquidos.sql` →
   `seed_stock_liquidos_snapshot.sql` → `seed_movimientos_apertura.sql`.

3. **Crear usuarios y perfiles**: en *Authentication > Users* del dashboard de Supabase, crear
   un usuario por cada persona (Ramiro, Walter, Haresh, Ishmael, Joaquín), y para cada uno
   insertar una fila en `perfiles` con su `id` (el UUID del usuario) y `rol` (`admin` para
   Ramiro/Walter, `socio` para el resto).

4. **Variables de entorno**:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   Completar `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (backend) y
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (frontend) con los valores de
   *Settings > API* del proyecto Supabase.

5. **Levantar en desarrollo**:
   ```bash
   npm run dev
   ```
   Backend en `http://localhost:4000` (healthcheck: `GET /health`), frontend en `http://localhost:5173`.

## Datos de referencia (histórico)

Cortes de stock total terminados (unidades), para validar cálculos — son totales agregados de
toda la destilería, coinciden con la suma de los 25 SKUs ya cargados en el corte de Sep01
(4,215 unidades, ver `seed_productos_terminados.sql` + `seed_movimientos_apertura.sql`):

Jun22=3048, Jun29=3048, Jul01=3135, Jul07=2484, Jul13=2814, Jul20=3138, Jul27=3714,
Ago04=3792, Ago10=4343, Ago17=2633, Ago25=2897, Sep01=4215.

**Salidas por destino (04 ago – 01 sep 2026, total 4,510 u., incl. garrafas 4L)** — desglosado
por línea, no por SKU individual, así que no se cargó como `movimientos_terminados` (se
inventaría precisión que la fuente no tiene). Extraído de "INVENTARIOS TERMINADOS 1 SETIEMBRE.html":

| Destino | Total | Líneas principales |
|---|---|---|
| Almacén Lima | 1,668 | Matacuy 1068, Licor de Café 300, Salqa Azul 180, Botanizado 120 |
| Exportación | 1,020 | Matacuy 756, Añejo 132, Salqa Verde 132 |
| Tienda Pachar | 488 | Cosecha 138, Licor de Café 122, resto repartido |
| Tambo del Inca | 316 | Matacuy 111, Añejo 132, Licor de Café 72 |
| Almacén Cusco | 312 | Matacuy 156, Salqa Azul 96, Cosecha 60 |
| El Albergue | 292 | repartido entre las 8 líneas |
| Herbario | 264 | Matacuy 108, Añejo 60, Cosecha 60 |
| Tienda Chuncho | 150 | Cosecha 60, Añejo 60, Matacuy 30 |

Por línea: Matacuy 2331, Licor de Café 574, Añejo 422, Botanizado 228, Salqa Azul 369,
Cosecha 379, Salqa Verde 201, Reposado 6.
