/**
 * Plantilla HTML del reporte en PDF.
 *
 * Devuelve la cadena, no el archivo: convertirla a PDF es cosa de
 * `expo-print`, y separarlo deja probable lo único que puede salir mal aquí —
 * que un nombre con `&` o `<` rompa el documento, o que los totales no cuadren
 * con lo que dice la tabla.
 */

import { formatMoney, sumCents } from '../money';
import type { FilaExportable } from './filas';

/**
 * Escapa para HTML. Un concepto llamado "Ropa & Calzado" o una nota con `<`
 * dejarían el documento mal formado, y el PDF sale con la tabla partida o con
 * texto desaparecido — sin error de por medio.
 */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface ResumenDeExportacion {
  readonly ingresosCents: number;
  readonly gastosCents: number;
  readonly balanceCents: number;
}

/** El resumen que encabeza el PDF, calculado de las mismas filas de la tabla. */
export function resumir(filas: readonly FilaExportable[]): ResumenDeExportacion {
  const ingresosCents = sumCents(
    filas.filter((f) => f.tipo === 'Ingreso').map((f) => f.montoCents),
  );
  const gastosCents = sumCents(
    filas.filter((f) => f.tipo === 'Gasto').map((f) => f.montoCents),
  );
  return { ingresosCents, gastosCents, balanceCents: ingresosCents - gastosCents };
}

/**
 * Documento completo: encabezado con el rango, resumen y tabla.
 *
 * Los estilos van en línea y sin fuentes externas: el motor de impresión
 * renderiza sin red, y una hoja de estilos remota que no cargue deja el PDF
 * sin formato.
 */
export function generarHtml(
  filas: readonly FilaExportable[],
  desde: string,
  hasta: string,
): string {
  const { ingresosCents, gastosCents, balanceCents } = resumir(filas);

  const cuerpo =
    filas.length === 0
      ? `<tr><td colspan="5" class="vacio">Sin movimientos en este periodo.</td></tr>`
      : filas
          .map(
            (f) => `<tr>
    <td>${f.fecha.slice(0, 10)}</td>
    <td>${escapar(f.concepto)}</td>
    <td>${escapar(f.cuenta)}</td>
    <td>${escapar(f.nota ?? '')}</td>
    <td class="monto ${f.tipo === 'Gasto' ? 'gasto' : 'ingreso'}">${
      f.tipo === 'Gasto' ? '-' : '+'
    }${formatMoney(f.montoCents)}</td>
  </tr>`,
          )
          .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, sans-serif; color: #1D1D1F; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .rango { color: #86868B; font-size: 12px; margin: 0 0 24px; }
  .resumen { display: flex; gap: 24px; margin-bottom: 24px; }
  .dato { border: 1px solid #E5E5EA; border-radius: 12px; padding: 12px 16px; }
  .dato span { display: block; font-size: 11px; color: #86868B; text-transform: uppercase; }
  .dato strong { font-size: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; border-bottom: 1px solid #1D1D1F; padding: 6px 4px; }
  td { border-bottom: 1px solid #E5E5EA; padding: 6px 4px; }
  .monto { text-align: right; white-space: nowrap; }
  .gasto { color: #DC2626; }
  .ingreso { color: #15803D; }
  .vacio { color: #86868B; text-align: center; padding: 24px; }
</style>
</head>
<body>
<h1>Movimientos</h1>
<p class="rango">Del ${desde} al ${hasta} · ${filas.length} ${
    filas.length === 1 ? 'movimiento' : 'movimientos'
  }</p>

<div class="resumen">
  <div class="dato"><span>Ingresos</span><strong class="ingreso">${formatMoney(ingresosCents)}</strong></div>
  <div class="dato"><span>Gastos</span><strong class="gasto">${formatMoney(gastosCents)}</strong></div>
  <div class="dato"><span>Balance</span><strong>${formatMoney(balanceCents)}</strong></div>
</div>

<table>
<thead><tr><th>Fecha</th><th>Concepto</th><th>Cuenta</th><th>Nota</th><th class="monto">Monto</th></tr></thead>
<tbody>
${cuerpo}
</tbody>
</table>
</body>
</html>`;
}
