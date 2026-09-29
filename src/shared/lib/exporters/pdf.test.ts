import type { FilaExportable } from './filas';
import { generarHtml, resumir } from './pdf';

function fila(f: Partial<FilaExportable> = {}): FilaExportable {
  return {
    fecha: '2026-09-15T10:30:00-07:00',
    tipo: 'Gasto',
    concepto: 'Comida',
    cuenta: 'General',
    montoCents: 123_45,
    ...f,
  };
}

describe('resumir', () => {
  it('separa ingresos de gastos y calcula el balance', () => {
    expect(
      resumir([
        fila({ tipo: 'Gasto', montoCents: 300_00 }),
        fila({ tipo: 'Gasto', montoCents: 200_00 }),
        fila({ tipo: 'Ingreso', montoCents: 1_000_00 }),
      ]),
    ).toEqual({ ingresosCents: 1_000_00, gastosCents: 500_00, balanceCents: 500_00 });
  });

  it('sin filas todo es cero', () => {
    expect(resumir([])).toEqual({
      ingresosCents: 0,
      gastosCents: 0,
      balanceCents: 0,
    });
  });

  it('el balance puede ser negativo', () => {
    expect(resumir([fila({ tipo: 'Gasto', montoCents: 100_00 })]).balanceCents).toBe(
      -100_00,
    );
  });

  /** BUG-001: la suma va por sumCents, no por reduce sobre flotantes. */
  it('no arrastra residuo de punto flotante', () => {
    expect(
      resumir([fila({ montoCents: 10 }), fila({ montoCents: 20 })]).gastosCents,
    ).toBe(30);
  });
});

describe('generarHtml', () => {
  it('declara UTF-8, sin el cual los acentos salen rotos en el PDF', () => {
    expect(generarHtml([], '2026-09-01', '2026-09-30')).toContain('<meta charset="utf-8"');
  });

  it('escribe el rango pedido', () => {
    expect(generarHtml([], '2026-07-01', '2026-09-30')).toContain(
      'Del 2026-07-01 al 2026-09-30',
    );
  });

  it('una fila de la tabla por movimiento', () => {
    const html = generarHtml([fila(), fila(), fila()], '2026-09-01', '2026-09-30');
    expect(html.match(/<tr>/g)).toHaveLength(4); // 3 filas + el encabezado
  });

  it('sin movimientos lo dice en vez de dejar la tabla vacía', () => {
    expect(generarHtml([], '2026-09-01', '2026-09-30')).toContain(
      'Sin movimientos en este periodo',
    );
  });

  it('el conteo concuerda en singular', () => {
    expect(generarHtml([fila()], '2026-09-01', '2026-09-30')).toContain('1 movimiento<');
  });

  it('el resumen coincide con las filas de la tabla', () => {
    const html = generarHtml(
      [
        fila({ tipo: 'Gasto', montoCents: 300_00 }),
        fila({ tipo: 'Ingreso', montoCents: 1_000_00 }),
      ],
      '2026-09-01',
      '2026-09-30',
    );
    expect(html).toContain('$1,000.00');
    expect(html).toContain('$300.00');
    expect(html).toContain('$700.00');
  });

  it('marca el gasto con signo menos y el ingreso con más', () => {
    const html = generarHtml(
      [
        fila({ tipo: 'Gasto', montoCents: 100_00 }),
        fila({ tipo: 'Ingreso', montoCents: 100_00 }),
      ],
      '2026-09-01',
      '2026-09-30',
    );
    expect(html).toContain('-$100.00');
    expect(html).toContain('+$100.00');
  });

  /**
   * Una categoría llamada "Ropa & Calzado" o una nota con `<` dejarían el
   * documento mal formado, y el PDF sale con la tabla partida o con texto
   * desaparecido — sin error de por medio.
   */
  describe('escapado de HTML', () => {
    it('escapa el ampersand', () => {
      const html = generarHtml([fila({ concepto: 'Ropa & Calzado' })], 'a', 'b');
      expect(html).toContain('Ropa &amp; Calzado');
      expect(html).not.toContain('Ropa & Calzado');
    });

    it('escapa los signos de menor y mayor', () => {
      const html = generarHtml([fila({ nota: '<script>alert(1)</script>' })], 'a', 'b');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('escapa la comilla doble', () => {
      expect(generarHtml([fila({ cuenta: 'El "bueno"' })], 'a', 'b')).toContain(
        'El &quot;bueno&quot;',
      );
    });
  });

  it('escribe solo la parte de fecha de cada movimiento', () => {
    expect(
      generarHtml([fila({ fecha: '2026-09-30T23:50:00-07:00' })], 'a', 'b'),
    ).toContain('<td>2026-09-30</td>');
  });

  /** El motor de impresión renderiza sin red: nada externo puede fallar. */
  it('no referencia hojas de estilo ni fuentes externas', () => {
    const html = generarHtml([fila()], 'a', 'b');
    expect(html).not.toContain('http');
    expect(html).not.toContain('<link');
  });
});
