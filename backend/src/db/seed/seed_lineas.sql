-- Seed de las 8 líneas reales mencionadas en la spec.
-- Colores en NULL: TODO confirmar con Ramiro los hex de los dashboards históricos
-- antes de usar esta data en el frontend (theme/lineColors.ts tiene una paleta
-- placeholder mientras tanto).
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

-- Nota: el "Historial de referencia" de la spec (stock total terminados por
-- corte: Jun22=3048 ... Sep01=4215) son TOTALES agregados de toda la
-- destilería, no movimientos por producto/línea. No se puede reconstruir
-- movimientos_terminados real a partir de esos totales sin inventar datos,
-- así que no se seedean movimientos ni productos aquí. Quedan como
-- referencia en el README para validar cálculos una vez haya carga real.
