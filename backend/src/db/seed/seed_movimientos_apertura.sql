-- Saldo de apertura de terminados al 01/09/2026, como movimientos tipo
-- "entrada" fechados ese día. No son movimientos reales históricos (no
-- tenemos el detalle día a día de entradas/salidas anterior a hoy) — es la
-- forma de que el stock_actual calculado (entradas - salidas) arranque
-- igual al corte real, en vez de en cero. Requiere haber corrido
-- seed_productos_terminados.sql antes. Se omiten los SKUs con stock 0
-- (constraint cantidad > 0).
insert into movimientos_terminados (producto_id, fecha, tipo, cantidad, destino)
select id, '2026-09-01', 'entrada', cantidad, null from (values
  ('SALQA AZUL 750 ml.', 48),
  ('SALQA AZUL 50 ml.', 180),
  ('SALQA VERDE 750 ml', 18),
  ('SALQA VERDE 375 ml', 6),
  ('SALQA VERDE 50 ml', 180),
  ('MATACUY 700 ml', 364),
  ('MATACUY 375 ml', 276),
  ('MATACUY 50 ml', 1443),
  ('SALQA AÑEJO 750 ml', 48),
  ('SALQA AÑEJO 375 ml', 48),
  ('SALQA AÑEJO 50 ml', 120),
  ('SALQA REPOSADO 750 ml', 99),
  ('SALQA REPOSADO 375 ml', 174),
  ('SALQA REPOSADO 50 ml', 180),
  ('COSECHA 750 ml', 155),
  ('COSECHA 375 ml', 174),
  ('BOTANIZADO 750 ml', 60),
  ('BOTANIZADO 375 ml', 42),
  ('BOTANIZADO 50 ml', 120),
  ('LICOR DE CAFÉ 750 ml', 204),
  ('LICOR DE CAFÉ 375 ml', 216),
  ('LICOR DE CAFÉ 50 ml', 60)
) as t(descripcion, cantidad)
join productos_terminados p on p.descripcion = t.descripcion;
