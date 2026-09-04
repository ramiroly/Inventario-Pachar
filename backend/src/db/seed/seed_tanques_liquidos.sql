-- 28 tanques reales (8 terminados + 20 subproductos) extraídos de
-- "INVENTARIO DE LIQUIDOS 1 DE SETIEMBRE.html" (array DATA). Esto resuelve
-- los TODO de capacidad_litros que quedaron pendientes en la migración
-- 004_tanques_liquidos.sql — son las capacidades reales, no supuestos.
insert into tanques_liquidos (linea_id, nombre, tipo, capacidad_litros, lote) values
-- Matacuy
((select id from lineas where nombre = 'Matacuy'), 'MATACUY LOTE 27 TERMINADO', 'terminado', 2500, 'Lote 27'),
((select id from lineas where nombre = 'Matacuy'), 'EXTRACCION BASE BOTANICA CRUDO', 'subproducto', 1100, null),
((select id from lineas where nombre = 'Matacuy'), 'MC ANÍS 80% EXTRACCIÓN', 'subproducto', 650, null),
((select id from lineas where nombre = 'Matacuy'), 'MC ANÍS CHACRA 35%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Matacuy'), 'MC APIO 80%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Matacuy'), 'MC CANELA Y CLAVO 80%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Matacuy'), 'MC HIERBA LUISA 80%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Matacuy'), 'MC HIERBA BUENA 80%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Matacuy'), 'MC HINOJO 80%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Matacuy'), 'MC MENTA 80%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Matacuy'), 'MC MANZANILLA 80%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Matacuy'), 'MC SIDRA 80%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Matacuy'), 'MC TORONJIL 80%', 'subproducto', 650, null),
-- Salqa Azul
((select id from lineas where nombre = 'Salqa Azul'), 'SALQA AZUL TERMINADO LOTE 135', 'terminado', 2500, 'Lote 135'),
((select id from lineas where nombre = 'Salqa Azul'), 'HIGH PROOF 80%', 'subproducto', 1100, null),
((select id from lineas where nombre = 'Salqa Azul'), 'CARMEN MODESTO CRUDO', 'subproducto', 1100, null),
-- Salqa Verde
((select id from lineas where nombre = 'Salqa Verde'), 'SALQA VERDE 47% TERMINADO LOTE 64', 'terminado', 2500, 'Lote 64'),
((select id from lineas where nombre = 'Salqa Verde'), 'DESTILADO DONAYRES CORAZÓN', 'subproducto', 2500, null),
-- Añejo
((select id from lineas where nombre = 'Añejo'), 'SALQA AÑEJO EN 42% TERMINADO K 3,5', 'terminado', 2500, 'K 3,5'),
((select id from lineas where nombre = 'Añejo'), 'ROBLE AMERICANO 60% AÑEJO K5', 'subproducto', 2500, null),
((select id from lineas where nombre = 'Añejo'), 'REPOSO WISKY MASH K 3,5', 'subproducto', 2500, null),
-- Reposado
((select id from lineas where nombre = 'Reposado'), 'SALQA REPOSADO EN 43% TERMINADO LOTE 15', 'terminado', 2500, 'Lote 15'),
-- Cosecha
((select id from lineas where nombre = 'Cosecha'), 'SALQA COSECHA TERMINADO LOTE 5', 'terminado', 2500, 'Lote 5'),
-- Botanizado
((select id from lineas where nombre = 'Botanizado'), 'SALQA BOTANIZADO NUEVO LOTE 19', 'terminado', 2500, 'Lote 19'),
((select id from lineas where nombre = 'Botanizado'), 'BASE FRANCHESCA 80%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Botanizado'), 'EXTRACCIONES MANZANA Y PERA 80%', 'subproducto', 650, null),
((select id from lineas where nombre = 'Botanizado'), 'EXTRACCIONES HOJAS CÍTRICAS 80%', 'subproducto', 650, null),
-- Licor de Café
((select id from lineas where nombre = 'Licor de Café'), 'LICOR DE CAFÉ EN 24% LOTE 5', 'terminado', 2500, 'Lote 5');
