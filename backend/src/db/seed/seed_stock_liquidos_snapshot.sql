-- Dos cortes reales (25 ago y 01 sep 2026) por tanque, extraídos de
-- "INVENTARIO DE LIQUIDOS 1 DE SETIEMBRE.html" (litros = corte actual,
-- prev = corte anterior). Requiere haber corrido seed_tanques_liquidos.sql
-- antes.
insert into stock_liquidos_snapshot (tanque_id, fecha_corte, litros)
select id, '2026-08-25', prev from (values
  ('MATACUY LOTE 27 TERMINADO', 290),
  ('EXTRACCION BASE BOTANICA CRUDO', 0),
  ('MC ANÍS 80% EXTRACCIÓN', 165),
  ('MC ANÍS CHACRA 35%', 220),
  ('MC APIO 80%', 100),
  ('MC CANELA Y CLAVO 80%', 40),
  ('MC HIERBA LUISA 80%', 470),
  ('MC HIERBA BUENA 80%', 120),
  ('MC HINOJO 80%', 110),
  ('MC MENTA 80%', 185),
  ('MC MANZANILLA 80%', 175),
  ('MC SIDRA 80%', 155),
  ('MC TORONJIL 80%', 130),
  ('SALQA AZUL TERMINADO LOTE 135', 470),
  ('HIGH PROOF 80%', 180),
  ('CARMEN MODESTO CRUDO', 0),
  ('SALQA VERDE 47% TERMINADO LOTE 64', 140),
  ('DESTILADO DONAYRES CORAZÓN', 2100),
  ('SALQA AÑEJO EN 42% TERMINADO K 3,5', 809),
  ('ROBLE AMERICANO 60% AÑEJO K5', 1050),
  ('REPOSO WISKY MASH K 3,5', 850),
  ('SALQA REPOSADO EN 43% TERMINADO LOTE 15', 270),
  ('SALQA COSECHA TERMINADO LOTE 5', 550),
  ('SALQA BOTANIZADO NUEVO LOTE 19', 520),
  ('BASE FRANCHESCA 80%', 200),
  ('EXTRACCIONES MANZANA Y PERA 80%', 90),
  ('EXTRACCIONES HOJAS CÍTRICAS 80%', 120),
  ('LICOR DE CAFÉ EN 24% LOTE 5', 70)
) as t(nombre, prev)
join tanques_liquidos tk on tk.nombre = t.nombre;

insert into stock_liquidos_snapshot (tanque_id, fecha_corte, litros)
select id, '2026-09-01', actual from (values
  ('MATACUY LOTE 27 TERMINADO', 70),
  ('EXTRACCION BASE BOTANICA CRUDO', 1000),
  ('MC ANÍS 80% EXTRACCIÓN', 135),
  ('MC ANÍS CHACRA 35%', 190),
  ('MC APIO 80%', 55),
  ('MC CANELA Y CLAVO 80%', 10),
  ('MC HIERBA LUISA 80%', 410),
  ('MC HIERBA BUENA 80%', 75),
  ('MC HINOJO 80%', 65),
  ('MC MENTA 80%', 155),
  ('MC MANZANILLA 80%', 130),
  ('MC SIDRA 80%', 95),
  ('MC TORONJIL 80%', 70),
  ('SALQA AZUL TERMINADO LOTE 135', 470),
  ('HIGH PROOF 80%', 115),
  ('CARMEN MODESTO CRUDO', 150),
  ('SALQA VERDE 47% TERMINADO LOTE 64', 130),
  ('DESTILADO DONAYRES CORAZÓN', 2100),
  ('SALQA AÑEJO EN 42% TERMINADO K 3,5', 809),
  ('ROBLE AMERICANO 60% AÑEJO K5', 1050),
  ('REPOSO WISKY MASH K 3,5', 850),
  ('SALQA REPOSADO EN 43% TERMINADO LOTE 15', 270),
  ('SALQA COSECHA TERMINADO LOTE 5', 550),
  ('SALQA BOTANIZADO NUEVO LOTE 19', 520),
  ('BASE FRANCHESCA 80%', 200),
  ('EXTRACCIONES MANZANA Y PERA 80%', 90),
  ('EXTRACCIONES HOJAS CÍTRICAS 80%', 120),
  ('LICOR DE CAFÉ EN 24% LOTE 5', 40)
) as t(nombre, actual)
join tanques_liquidos tk on tk.nombre = t.nombre;
