-- SKUs de producto embotellado.
--
-- Reglas de upb (unidades por caja/plancha), según spec:
--   750ml            -> 6   (caja)
--   375ml            -> 6   (caja)
--   700ml (Matacuy, exportación) -> 6 (caja)
--   50ml              -> 60  (plancha), EXCEPTO Matacuy 50ml -> 111 (plancha)
--
-- SKUs "INGLES" (exportación: Salqa Verde 750 Inglés, Matacuy 750 Inglés, Salqa Añejo 750 Inglés)
-- suman al total de 750ml de su línea pero se muestran separados en detalle/tooltip.
-- Se identifican por descripcion (ILIKE '%inglés%' o '%ingles%') hasta que se defina un flag dedicado.
--
-- Matacuy 700ml (exportación Europa): formato=700, es_exportacion=true.
-- NUNCA se suma a 750ml, y por decisión de Ramiro (03/09/2026) se EXCLUYE del gráfico
-- apilado principal — solo aparece en tabla ejecutiva y desglose de cajas.
-- Ver dashboards.routes.ts / dashboards.service donde se filtra este caso.
create table if not exists productos_terminados (
  id uuid primary key default gen_random_uuid(),
  linea_id uuid not null references lineas(id) on delete restrict,
  descripcion text not null,
  formato smallint not null check (formato in (750, 700, 375, 50)),
  upb integer not null check (upb > 0),
  tipo_envase text not null check (tipo_envase in ('caja', 'plancha')),
  es_exportacion boolean not null default false
);

create index if not exists idx_productos_terminados_linea on productos_terminados(linea_id);
