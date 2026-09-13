/**
 * El despachador elige backend segun haya credenciales. Sin ellas debe caer al
 * de memoria sin tocar Supabase: es lo que permite correr esta misma suite y
 * abrir la app sin backend.
 */

import { fetchCategories } from '.';

describe('categorias (despachador)', () => {
  it('delega la consulta al backend local sin credenciales', async () => {
    const categories = await fetchCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.every((c) => c.id && c.name && c.color)).toBe(true);
  });
});
