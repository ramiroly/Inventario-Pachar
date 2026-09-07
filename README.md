# Sistema de Inventario — Destilería Pachar

Reemplaza el flujo de Excel semanal + dashboards HTML manuales por un sistema web con login,
carga de movimientos de stock, y generación bajo demanda de los mismos dashboards interactivos.
Ver la especificación completa en `especificacion_sistema_inventario.md` (spec original del proyecto).

## Estado de este scaffold

Modelo de datos + backend con los cálculos ya validados (Fases 1-2 de la spec), ya con datos
reales cargados: colores por línea, 34 SKUs de terminados (25 del corte inicial + 3 variantes
"Inglés" de exportación + 6 garrafas de 4L), los 28 tanques de líquidos con sus capacidades
reales, y el historial real de movimientos de terminados del 04/08 al 01/09/2026 — 72 salidas
reales por fecha/destino/cantidad, tomadas de
`referencia_dashboards/../TERMINADOS PACHAR 1 SETIEMBRE cloude.xlsx` (hoja "salidas de
productos") — más un saldo de apertura calculado por SKU para que el stock resultante
(entradas − salidas) coincida exacto con el corte real del 01/09/2026 (ver `backend/src/db/seed/`).

El dashboard de **stock terminados** ya está reconstruido igual al HTML histórico (gráficos,
tooltips, cobertura, salidas por destino, todo con datos reales). Comparativo y Líquidos todavía
tienen páginas placeholder que consumen la misma API. Falta también el formulario de carga
completo para que los admins registren movimientos nuevos desde la UI (hoy solo existe un
placeholder básico).

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
   los archivos de `backend/src/db/migrations/` (001 a 008), y luego los de
   `backend/src/db/seed/` en este orden (cada uno depende del anterior por llaves foráneas):
   `seed_lineas.sql` → `seed_productos_terminados.sql` → `seed_productos_ingles_garrafa.sql` →
   `seed_tanques_liquidos.sql` → `seed_stock_liquidos_snapshot.sql` → `seed_movimientos_reales.sql`.

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
toda la destilería, coinciden exacto con el stock calculado (entradas − salidas) de los 34 SKUs
ya cargados al corte de Sep01 (4,215 unidades):

Jun22=3048, Jun29=3048, Jul01=3135, Jul07=2484, Jul13=2814, Jul20=3138, Jul27=3714,
Ago04=3792, Ago10=4343, Ago17=2633, Ago25=2897, Sep01=4215.

**Movimientos reales de terminados (04 ago – 01 sep 2026)**: `seed_movimientos_reales.sql` carga
las 72 salidas reales (fecha, SKU, destino, cantidad) tal cual están en
`TERMINADOS PACHAR 1 SETIEMBRE cloude.xlsx` (hoja "salidas de productos"), verificadas contra
el dashboard histórico — el total (4,510 u.) y el desglose por destino y por línea coinciden
exacto. Como no hay registro de entradas/producción real anterior al 04/08, cada SKU arranca con
un **saldo de apertura calculado** (`stock_real_al_01_set + total_salidas_del_periodo`, fechado
2026-08-03, un día antes del primer movimiento real) para que el stock resultante llegue exacto
al corte real — no es un número inventado, es la única apertura consistente con ambos datos
reales conocidos (corte final y salidas del período).
