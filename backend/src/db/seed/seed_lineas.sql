-- Seed de las 8 líneas reales, con los colores reales extraídos del
-- dashboard histórico "INVENTARIO DE LIQUIDOS 1 DE SETIEMBRE.html"
-- (arrays LC=color_dark, LCL=color_light, LCS=color_sub).
insert into lineas (nombre) values
  ('Matacuy'),
  ('Salqa Azul'),
  ('Salqa Verde'),
  ('Añejo'),
  ('Reposado'),
  ('Cosecha'),
  ('Botanizado'),
  ('Licor de Café')
on conflict (nombre) do nothing;

update lineas set color_dark = '#024A00', color_light = '#8FBC8E', color_sub = '#036B00' where nombre = 'Matacuy';
update lineas set color_dark = '#0B3D6B', color_light = '#85C1E9', color_sub = '#1A5276' where nombre = 'Salqa Azul';
update lineas set color_dark = '#1E8449', color_light = '#A9DFBF', color_sub = '#1E8449' where nombre = 'Salqa Verde';
update lineas set color_dark = '#622211', color_light = '#C8928A', color_sub = '#7D2D1A' where nombre = 'Añejo';
update lineas set color_dark = '#117A65', color_light = '#A2D9CE', color_sub = '#148F77' where nombre = 'Reposado';
update lineas set color_dark = '#7D6608', color_light = '#F9E79F', color_sub = '#9A7D0A' where nombre = 'Cosecha';
update lineas set color_dark = '#009124', color_light = '#A9DFBF', color_sub = '#0B7B1E' where nombre = 'Botanizado';
update lineas set color_dark = '#422302', color_light = '#D7BDE2', color_sub = '#5D3215' where nombre = 'Licor de Café';

-- Nota: el "Historial de referencia" de la spec (stock total terminados por
-- corte: Jun22=3048 ... Sep01=4215) son TOTALES agregados de toda la
-- destilería. El corte de Sep01 desglosado por SKU se carga en
-- seed_productos_terminados.sql / seed_movimientos_apertura.sql.
