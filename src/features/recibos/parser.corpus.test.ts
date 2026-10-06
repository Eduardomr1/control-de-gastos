import { CORPUS } from './__fixtures__/corpus';
import { leerRecibo } from './parser';

/**
 * El parser contra el corpus completo. El criterio de salida del plan es que
 * el total salga bien en al menos 7 de cada 10 recibos; además se cuenta
 * aparte el error peor —prellenar un total EQUIVOCADO—, porque un campo vacío
 * el usuario lo nota y un monto mal leído lo guarda sin mirarlo.
 */

const HOY = '2026-09-23';

function sinAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

const resultados = CORPUS.map((r) => ({ r, leido: leerRecibo(r.lineas, HOY) }));

const totalBien = resultados.filter(({ r, leido }) => leido.totalCents === r.esperado.totalCents);
const totalInventado = resultados.filter(
  ({ r, leido }) => leido.totalCents !== null && leido.totalCents !== r.esperado.totalCents,
);
const fechaBien = resultados.filter(({ r, leido }) => leido.fecha === r.esperado.fecha);
const comercioBien = resultados.filter(({ r, leido }) => {
  if (r.esperado.comercio === null) return leido.comercio === null;
  if (leido.comercio === null) return false;
  const a = sinAcentos(r.esperado.comercio);
  const b = sinAcentos(leido.comercio);
  return a.includes(b) || b.includes(a);
});

const fallas = resultados
  .filter(({ r, leido }) => leido.totalCents !== r.esperado.totalCents)
  .map(({ r, leido }) => `${r.id}: esperado ${r.esperado.totalCents}, leido ${leido.totalCents}`);

describe('parser contra el corpus', () => {
  /**
   * Criterio de salida del plan cumplido: la meta era 7 de cada 10 (>= 45/64)
   * y se alcanzan 47/64 (73.4%). Se fija 47 como nuevo piso contra regresiones.
   */
  it(`cumple y supera la meta de 45/64 en el total (${totalBien.length}/${CORPUS.length})`, () => {
    expect({ aciertos: totalBien.length, fallas }).toMatchObject({
      aciertos: expect.any(Number),
    });
    expect(totalBien.length).toBeGreaterThanOrEqual(47);
  });

  /** Criterio cumplido: a lo más 6/64 totales equivocados; se reduce a 5/64. */
  it(`no inventa mas de 5/64 totales equivocados (${totalInventado.length}/${CORPUS.length})`, () => {
    expect(totalInventado.length).toBeLessThanOrEqual(5);
  });

  it(`lee bien la fecha en al menos 7 de cada 10 (${fechaBien.length}/${CORPUS.length})`, () => {
    expect(fechaBien.length / CORPUS.length).toBeGreaterThanOrEqual(0.7);
  });

  it(`reconoce el comercio en al menos 7 de cada 10 (${comercioBien.length}/${CORPUS.length})`, () => {
    expect(comercioBien.length / CORPUS.length).toBeGreaterThanOrEqual(0.7);
  });
});
