import { agruparEnSecciones } from './secciones';
import type { Expense } from '@/types/expense';

function gasto(occurredAt: string, amountCents: number, id = occurredAt): Expense {
  return {
    id,
    amountCents,
    currency: 'MXN',
    categoryId: 'otros',
    occurredAt,
    syncState: 'synced',
    updatedAt: occurredAt,
  };
}

describe('agruparEnSecciones', () => {
  it('ordena los meses del más reciente al más antiguo', () => {
    const secciones = agruparEnSecciones([
      gasto('2026-08-24T12:00:00-07:00', 74200),
      gasto('2026-09-11T12:00:00-07:00', 48000),
    ]);

    expect(secciones.map((s) => s.mes)).toEqual(['2026-09', '2026-08']);
  });

  it('ordena cada mes con el gasto más reciente arriba', () => {
    const secciones = agruparEnSecciones([
      gasto('2026-09-03T12:00:00-07:00', 31600),
      gasto('2026-09-11T12:00:00-07:00', 48000),
      gasto('2026-09-05T12:00:00-07:00', 620000),
    ]);

    expect(secciones[0]?.data.map((e) => e.amountCents)).toEqual([48000, 620000, 31600]);
  });

  // La regresión que este offset existe para evitar: SectionList reinicia el
  // índice en cada sección, así que sin él la primera fila de cada mes sería
  // `gasto-0` y el testID dejaría de identificar una sola fila.
  it('desplaza el offset para que el índice sea único en toda la lista', () => {
    const secciones = agruparEnSecciones([
      gasto('2026-09-11T12:00:00-07:00', 48000),
      gasto('2026-09-05T12:00:00-07:00', 620000),
      gasto('2026-08-24T12:00:00-07:00', 74200),
      gasto('2026-07-02T12:00:00-07:00', 10000),
    ]);

    expect(secciones.map((s) => s.offset)).toEqual([0, 2, 3]);

    const indices = secciones.flatMap((s) => s.data.map((_, i) => s.offset + i));
    expect(indices).toEqual([0, 1, 2, 3]);
    expect(new Set(indices).size).toBe(indices.length);
  });

  it('suma el subtotal de cada mes por separado', () => {
    const secciones = agruparEnSecciones([
      gasto('2026-09-11T12:00:00-07:00', 48000),
      gasto('2026-09-05T12:00:00-07:00', 620000),
      gasto('2026-08-24T12:00:00-07:00', 74200),
    ]);

    expect(secciones[0]?.subtotal).toBe(668000);
    expect(secciones[1]?.subtotal).toBe(74200);
  });

  // CASO QA #4 — el corte de mes se calcula en hora local, no en UTC.
  it('deja en enero un gasto de las 23:50 del 31 de enero en Culiacán', () => {
    const secciones = agruparEnSecciones([gasto('2026-01-31T23:50:00-07:00', 30000)]);

    expect(secciones).toHaveLength(1);
    expect(secciones[0]?.mes).toBe('2026-01');
  });

  it('devuelve una lista vacía sin gastos', () => {
    expect(agruparEnSecciones([])).toEqual([]);
  });
});
