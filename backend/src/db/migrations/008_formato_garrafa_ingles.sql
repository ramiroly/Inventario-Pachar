-- El Excel real de salidas ("TERMINADOS PACHAR 1 SETIEMBRE cloude.xlsx",
-- hoja "salidas de productos") reveló 2 tipos de SKU que no estaban en el
-- corte de stock inicial pero sí se despachan:
--   - Garrafas de 4L (spec: "Incluir garrafas de 4L como unidades") -> se
--     modelan con formato=4000 (ml) y tipo_envase='unidad', upb=1 (cada
--     garrafa es su propia unidad, no va en caja/plancha).
--   - SKUs "Inglés" de exportación (Matacuy, Salqa Añejo, Salqa Verde
--     750ml Inglés) -> ya contemplados en el comentario de 002, pero el
--     check constraint de formato solo permitía 750/700/375/50, y estos
--     SÍ caen en 750 así que no hacía falta tocar el constraint para
--     ellos — este archivo solo agrega 4000 para las garrafas.
alter table productos_terminados drop constraint productos_terminados_formato_check;
alter table productos_terminados add constraint productos_terminados_formato_check
  check (formato in (750, 700, 375, 50, 4000));

alter table productos_terminados drop constraint productos_terminados_tipo_envase_check;
alter table productos_terminados add constraint productos_terminados_tipo_envase_check
  check (tipo_envase in ('caja', 'plancha', 'unidad'));
