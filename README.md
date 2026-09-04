# Sistema de Inventario — Destilería Pachar

Reemplaza el flujo de Excel semanal + dashboards HTML manuales por un sistema web con login,
carga de movimientos de stock, y generación bajo demanda de los mismos dashboards interactivos.
Ver la especificación completa en `especificacion_sistema_inventario.md` (spec original del proyecto).

## Estado de este scaffold

Este es el andamiaje inicial (Fases 1-2 de la spec: modelo de datos + backend con los cálculos
ya validados). Todavía falta: colores reales por línea, capacidades de tanques a confirmar con
Ramiro, formulario de carga completo, y la réplica visual exacta de los dashboards históricos.
Los `TODO` en el código marcan estos puntos.

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
   los archivos de `backend/src/db/migrations/` (001 a 007), y luego `backend/src/db/seed/seed_lineas.sql`.

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

Cortes de stock total terminados (unidades), para validar cálculos una vez haya carga real
de movimientos — son totales agregados, no movimientos individuales, así que no se pueden usar
para reconstruir `movimientos_terminados`:

Jun22=3048, Jun29=3048, Jul01=3135, Jul07=2484, Jul13=2814, Jul20=3138, Jul27=3714,
Ago04=3792, Ago10=4343, Ago17=2633, Ago25=2897, Sep01=4215.
