-- Líneas de producto (Matacuy, Salqa Azul, etc.)
create table if not exists lineas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  -- TODO: confirmar con Ramiro los hex reales de cada línea (paleta de los dashboards históricos).
  -- Se dejan nullable para no inventar colores.
  color_dark text,
  color_light text,
  color_sub text
);
