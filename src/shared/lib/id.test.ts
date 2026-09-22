import { generarId } from './id';

describe('generarId', () => {
  it('produce un UUID v4 bien formado', () => {
    expect(generarId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  /**
   * No prueba la calidad del generador —es Math.random, no criptografía— sino
   * que el reemplazo no esté devolviendo una plantilla constante. Un id
   * repetido haría que el segundo registro sobrescribiera al primero.
   */
  it('no repite en mil intentos', () => {
    const ids = new Set(Array.from({ length: 1000 }, generarId));
    expect(ids.size).toBe(1000);
  });
});
