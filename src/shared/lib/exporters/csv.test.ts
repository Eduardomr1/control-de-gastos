import { BOM, generarCsv } from './csv';
import type { FilaExportable } from './filas';

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

/** Las líneas de datos, sin BOM, sin encabezado y sin la línea final vacía. */
function datos(csv: string): string[] {
  return csv.replace(BOM, '').trimEnd().split('\r\n').slice(1);
}

describe('generarCsv', () => {
  /**
   * Sin BOM, Excel en Windows abre el archivo con la codificación del sistema
   * y todo lo que no sea ASCII se ve ilegible. Tres bytes que deciden si el
   * export se puede leer.
   */
  it('empieza con el BOM de UTF-8', () => {
    expect(generarCsv([]).startsWith(BOM)).toBe(true);
  });

  it('lleva encabezados aunque no haya filas', () => {
    expect(generarCsv([]).replace(BOM, '').trimEnd()).toBe(
      'Fecha,Tipo,Concepto,Cuenta,Monto,Nota',
    );
  });

  it('usa CRLF, que es lo que pide RFC 4180', () => {
    expect(generarCsv([fila()])).toContain('\r\n');
  });

  it('escribe solo la parte de fecha, en hora local', () => {
    expect(datos(generarCsv([fila({ fecha: '2026-09-30T23:50:00-07:00' })]))[0]).toMatch(
      /^2026-09-30,/,
    );
  });

  /**
   * El monto va como número puro: punto decimal, sin separador de miles y sin
   * símbolo. `formatMoney` produce "$1,234.56", que en una celda es texto y
   * deja de sumarse — justo lo contrario de para qué se exporta.
   */
  it('escribe el monto sin símbolo ni separador de miles', () => {
    expect(datos(generarCsv([fila({ montoCents: 1_234_567_89 })]))[0]).toContain(
      '-1234567.89',
    );
  });

  it('conserva los dos decimales aunque sean cero', () => {
    expect(datos(generarCsv([fila({ montoCents: 500_00 })]))[0]).toContain('-500.00');
  });

  it('rellena el decimal de un monto de centavos sueltos', () => {
    expect(datos(generarCsv([fila({ montoCents: 5 })]))[0]).toContain('-0.05');
  });

  /**
   * Puesta así, la columna Monto se suma de golpe en la hoja y da el balance
   * del periodo, que es lo primero que alguien hace con un export.
   */
  it('los gastos salen en negativo y los ingresos en positivo', () => {
    const csv = generarCsv([
      fila({ tipo: 'Gasto', montoCents: 300_00 }),
      fila({ tipo: 'Ingreso', montoCents: 1_000_00, concepto: 'Sueldo' }),
    ]);
    const [gasto, ingreso] = datos(csv);
    expect(gasto).toContain(',-300.00,');
    expect(ingreso).toContain(',1000.00,');
  });

  describe('escapado RFC 4180', () => {
    it('entrecomilla lo que trae una coma', () => {
      expect(datos(generarCsv([fila({ nota: 'Cena, postre y café' })]))[0]).toContain(
        '"Cena, postre y café"',
      );
    });

    it('duplica la comilla interior', () => {
      expect(datos(generarCsv([fila({ nota: 'El "super"' })]))[0]).toContain(
        '"El ""super"""',
      );
    });

    it('entrecomilla lo que trae un salto de línea', () => {
      expect(datos(generarCsv([fila({ nota: 'Dos\nrenglones' })]))[0]).toContain(
        '"Dos\nrenglones"',
      );
    });

    /**
     * Entrecomillar todo también sería válido, pero algunas hojas de cálculo
     * tratan como texto un número entre comillas y deja de sumarse.
     */
    it('no entrecomilla lo que no lo necesita', () => {
      const linea = datos(generarCsv([fila({ concepto: 'Comida', nota: 'simple' })]))[0];
      expect(linea).not.toContain('"');
    });

    it('la coma de una nota no corre las columnas', () => {
      const linea = datos(generarCsv([fila({ nota: 'a,b,c' })]))[0] ?? '';
      // Seis campos: cinco comas separadoras, más las dos de dentro de la nota
      // que van protegidas por comillas.
      expect(linea.split('"')[0]?.split(',')).toHaveLength(6);
    });
  });

  it('una fila sin nota deja la columna vacía, no "undefined"', () => {
    expect(datos(generarCsv([fila()]))[0]?.endsWith(',')).toBe(true);
  });

  it('una fila por movimiento', () => {
    expect(datos(generarCsv([fila(), fila(), fila()]))).toHaveLength(3);
  });
});
