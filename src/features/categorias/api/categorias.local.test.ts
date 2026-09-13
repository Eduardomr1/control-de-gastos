import { fetchCategories } from './categorias.local';

describe('fetchCategories', () => {
  it('devuelve las categorías disponibles', async () => {
    const categories = await fetchCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.every((c) => c.id && c.name && c.color)).toBe(true);
  });
});
