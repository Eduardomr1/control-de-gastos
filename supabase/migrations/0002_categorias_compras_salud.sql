-- Compras y Salud: las dos categorías que faltaban frente al diseño.
--
-- Migración aparte y no una edición de 0001: esa ya corrió en los entornos
-- existentes, así que cambiarla no agregaría las filas en ninguno.
--
-- Salud va en verde azulado y no en rojo a propósito: el rojo de la paleta
-- (#DC2626) significa error, y una categoría no es un estado de falla.

insert into public.categories (id, name, color) values
  ('compras',  'Compras',  '#EC4899'),
  ('salud',    'Salud',    '#14B8A6')
on conflict (id) do nothing;
