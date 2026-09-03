-- Entradas y salidas de stock de producto terminado.
-- Las garrafas de 4L se registran como unidades normales (cantidad = # de garrafas).
create table if not exists movimientos_terminados (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos_terminados(id) on delete restrict,
  fecha date not null,
  tipo text not null check (tipo in ('entrada', 'salida')),
  cantidad integer not null check (cantidad > 0),
  -- destino solo aplica a salidas; se deja como texto libre (no enum estricto)
  -- para no romper si aparece un destino nuevo. Destinos habituales documentados
  -- en backend/src/types/models.ts (DESTINOS_HABITUALES).
  destino text,
  constraint chk_destino_solo_en_salida check (
    (tipo = 'salida') or (tipo = 'entrada' and destino is null)
  )
);

create index if not exists idx_movimientos_producto_fecha on movimientos_terminados(producto_id, fecha);
