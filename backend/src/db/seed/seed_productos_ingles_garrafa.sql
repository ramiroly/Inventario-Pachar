-- 9 SKUs que aparecen en el registro real de salidas
-- ("TERMINADOS PACHAR 1 SETIEMBRE cloude.xlsx", hoja "salidas de productos")
-- pero no estaban en el corte de stock inicial: las 3 variantes de
-- exportación "Inglés" (spec: "suman al total de 750ml de su línea pero se
-- muestran separados en detalle/tooltip") y las 6 garrafas de 4L (spec:
-- "Incluir garrafas de 4L como unidades"). Requiere haber corrido la
-- migración 008 (agrega formato=4000 y tipo_envase='unidad').
insert into productos_terminados (linea_id, descripcion, formato, upb, tipo_envase, es_exportacion) values
((select id from lineas where nombre = 'Matacuy'), 'MATACUY 750 ml INGLES', 750, 6, 'caja', true),
((select id from lineas where nombre = 'Añejo'), 'SALQA AÑEJO INGLES', 750, 6, 'caja', true),
((select id from lineas where nombre = 'Salqa Verde'), 'SALQA VERDE INGLES', 750, 6, 'caja', true),
((select id from lineas where nombre = 'Matacuy'), 'GARRAFA MATACUY 4 lt.', 4000, 1, 'unidad', false),
((select id from lineas where nombre = 'Salqa Azul'), 'GARRAFA SALQA AZUL 4 lt.', 4000, 1, 'unidad', false),
((select id from lineas where nombre = 'Cosecha'), 'GARRAFA COSECHA 4 lt.', 4000, 1, 'unidad', false),
((select id from lineas where nombre = 'Añejo'), 'GARRAFA AÑEJO 4 lt.', 4000, 1, 'unidad', false),
((select id from lineas where nombre = 'Salqa Verde'), 'GARRAFA VERDE 4 lt.', 4000, 1, 'unidad', false),
((select id from lineas where nombre = 'Licor de Café'), 'GARRAFA LICOR DE CAFÉ 4 lt.', 4000, 1, 'unidad', false);
