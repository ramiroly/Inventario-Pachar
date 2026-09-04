-- 25 SKUs reales extraídos de "INVENTARIOS TERMINADOS 1 SETIEMBRE.html"
-- (array P) y "COMPARATIVA TERMINADOS 1 DE SETIEMBRE.html" (array C).
-- Matacuy 700ml es la única exportación real detectada en los datos
-- (formato=700, es_exportacion=true) — no aparecen todavía SKUs "Inglés"
-- separados (Salqa Verde/Añejo 750 Inglés) en el corte actual.
insert into productos_terminados (linea_id, descripcion, formato, upb, tipo_envase, es_exportacion) values
((select id from lineas where nombre = 'Salqa Azul'), 'SALQA AZUL 750 ml.', 750, 6, 'caja', false),
((select id from lineas where nombre = 'Salqa Azul'), 'SALQA AZUL 375 ml.', 375, 6, 'caja', false),
((select id from lineas where nombre = 'Salqa Azul'), 'SALQA AZUL 50 ml.', 50, 60, 'caja', false),
((select id from lineas where nombre = 'Salqa Verde'), 'SALQA VERDE 750 ml', 750, 6, 'caja', false),
((select id from lineas where nombre = 'Salqa Verde'), 'SALQA VERDE 375 ml', 375, 6, 'caja', false),
((select id from lineas where nombre = 'Salqa Verde'), 'SALQA VERDE 50 ml', 50, 60, 'caja', false),
((select id from lineas where nombre = 'Matacuy'), 'MATACUY 750 ml', 750, 6, 'caja', false),
((select id from lineas where nombre = 'Matacuy'), 'MATACUY 700 ml', 700, 6, 'caja', true),
((select id from lineas where nombre = 'Matacuy'), 'MATACUY 375 ml', 375, 6, 'caja', false),
((select id from lineas where nombre = 'Matacuy'), 'MATACUY 50 ml', 50, 111, 'plancha', false),
((select id from lineas where nombre = 'Añejo'), 'SALQA AÑEJO 750 ml', 750, 6, 'caja', false),
((select id from lineas where nombre = 'Añejo'), 'SALQA AÑEJO 375 ml', 375, 6, 'caja', false),
((select id from lineas where nombre = 'Añejo'), 'SALQA AÑEJO 50 ml', 50, 60, 'caja', false),
((select id from lineas where nombre = 'Reposado'), 'SALQA REPOSADO 750 ml', 750, 6, 'caja', false),
((select id from lineas where nombre = 'Reposado'), 'SALQA REPOSADO 375 ml', 375, 6, 'caja', false),
((select id from lineas where nombre = 'Reposado'), 'SALQA REPOSADO 50 ml', 50, 60, 'caja', false),
((select id from lineas where nombre = 'Cosecha'), 'COSECHA 750 ml', 750, 6, 'caja', false),
((select id from lineas where nombre = 'Cosecha'), 'COSECHA 375 ml', 375, 6, 'caja', false),
((select id from lineas where nombre = 'Cosecha'), 'COSECHA 50 ml', 50, 60, 'caja', false),
((select id from lineas where nombre = 'Botanizado'), 'BOTANIZADO 750 ml', 750, 6, 'caja', false),
((select id from lineas where nombre = 'Botanizado'), 'BOTANIZADO 375 ml', 375, 6, 'caja', false),
((select id from lineas where nombre = 'Botanizado'), 'BOTANIZADO 50 ml', 50, 60, 'caja', false),
((select id from lineas where nombre = 'Licor de Café'), 'LICOR DE CAFÉ 750 ml', 750, 6, 'caja', false),
((select id from lineas where nombre = 'Licor de Café'), 'LICOR DE CAFÉ 375 ml', 375, 6, 'caja', false),
((select id from lineas where nombre = 'Licor de Café'), 'LICOR DE CAFÉ 50 ml', 50, 60, 'caja', false);
