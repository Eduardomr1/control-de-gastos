/**
 * Generación de CSV.
 *
 * Todo lo que puede salir mal en un CSV sale mal en silencio: una coma sin
 * escapar corre una columna, un acento sin BOM se ve como "Ã±" en Excel, y un
 * monto con separador de miles deja de ser un número para la hoja de cálculo.
 * Nada de eso lanza un error; simplemente el archivo queda mal. Por eso este
 * módulo es puro y tiene pruebas propias.
 */

import type { FilaExportable } from './filas';

/**
 * Marca de orden de bytes UTF-8.
 *
 * Sin ella, Excel en Windows abre el archivo con la codificación del sistema y
 * "Comida" pasa, pero "Salud · Farmacia" no: los acentos y el resto de
 * caracteres no ASCII salen ilegibles. Tres bytes que deciden si el archivo se
 * puede leer o no.
 */
export const BOM = '﻿';

const ENCABEZADOS = ['Fecha', 'Tipo', 'Concepto', 'Cuenta', 'Monto', 'Nota'] as const;

/**
 * Escapa un valor según RFC 4180.
 *
 * Se entrecomilla solo lo que lo necesita —coma, comilla, salto de línea— y la
 * comilla interior se duplica. Entrecomillar todo también sería válido, pero
 * un CSV donde hasta los montos van entre comillas hace que algunas hojas de
 * cálculo los traten como texto y dejen de sumarse.
 */
function escapar(valor: string): string {
  return /[",\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/**
 * Monto en formato que una hoja de cálculo entiende como número: punto
 * decimal, sin separador de miles y sin símbolo de moneda.
 *
 * No usa `formatMoney`: ese formatea para mirar ("$1,234.56") y esa cadena, en
 * una celda, es texto. La columna Monto existe para sumarse.
 */
function monto(cents: number): string {
  const signo = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${signo}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** La parte de fecha de un ISO con offset, en hora local. */
function soloFecha(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Genera el CSV completo, con BOM y encabezados.
 *
 * Los gastos salen en negativo y los ingresos en positivo: puesta así, la
 * columna Monto se suma de golpe en la hoja y da el balance del periodo, que
 * es lo primero que alguien hace con un export.
 *
 * Las líneas van con CRLF, que es lo que pide RFC 4180 y lo que espera Excel.
 */
export function generarCsv(filas: readonly FilaExportable[]): string {
  const lineas = [
    ENCABEZADOS.join(','),
    ...filas.map((fila) =>
      [
        soloFecha(fila.fecha),
        fila.tipo,
        escapar(fila.concepto),
        escapar(fila.cuenta),
        monto(fila.tipo === 'Gasto' ? -fila.montoCents : fila.montoCents),
        escapar(fila.nota ?? ''),
      ].join(','),
    ),
  ];

  return BOM + lineas.join('\r\n') + '\r\n';
}
