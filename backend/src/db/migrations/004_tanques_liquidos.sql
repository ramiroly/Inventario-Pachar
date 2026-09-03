-- Tanques de líquidos (terminado o subproducto) por línea.
--
-- Capacidades conocidas (referencia, no se fuerzan por constraint porque hay excepciones):
--   terminados                         -> 2500L estándar
--   subproductos Matacuy                -> 650L (confirmar excepciones caso a caso,
--                                          ej. Extracción Base Botánica = 2 tanques de 600L)
--   Salqa Azul subs                     -> 1100L
--   Botanizado subs                     -> 650L
--   Añejo K5 / Reposo Wisky Mash        -> 2500L
--   Salqa Verde Donayres                -> 2500L (o 2500+1000 según corte)
--   Nuevos subproductos sin capacidad definida -> preguntar a Ramiro antes de asumir.
--     Por eso capacidad_litros es NULLABLE: NULL = capacidad pendiente de confirmar.
create table if not exists tanques_liquidos (
  id uuid primary key default gen_random_uuid(),
  linea_id uuid not null references lineas(id) on delete restrict,
  nombre text not null,
  tipo text not null check (tipo in ('terminado', 'subproducto')),
  capacidad_litros numeric, -- TODO: confirmar con Ramiro cuando sea NULL
  lote text
);

create index if not exists idx_tanques_linea on tanques_liquidos(linea_id);
