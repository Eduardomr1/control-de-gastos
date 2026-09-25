/**
 * Cuándo toca cada cobro.
 *
 * La decisión que gobierna todo este archivo: **cada ocurrencia se calcula
 * desde la fecha de inicio, no desde la anterior.**
 *
 * Encadenar —"la siguiente es un mes después de la última"— parece más simple
 * y arrastra dos errores. Uno: "el 31 de cada mes" se convierte en "el 28 de
 * cada mes" para siempre en cuanto pasa por febrero, porque el 28 se vuelve la
 * nueva base. Dos: si una ocurrencia se pierde, todas las siguientes quedan
 * corridas.
 *
 * Con la fecha de inicio como ancla fija, la ocurrencia n es una función pura
 * de (inicio, frecuencia, n): el 31 de enero produce 28 de febrero y luego 31
 * de marzo, y una ocurrencia perdida no mueve a las demás.
 */

import {
  comparaInstantes,
  componentesLocales,
  diasDelMes,
  isoLocal,
} from '@/shared/lib/date';

import type { Frecuencia } from './types';

/**
 * La ocurrencia número `n` contando desde la de inicio, que es la 0.
 *
 * El día se recorta al último del mes cuando no existe (31 de febrero → 28, o
 * 29 en bisiesto). La hora y el offset se conservan tal cual: un cobro de las
 * 09:00 sigue siendo de las 09:00 en marzo.
 */
export function ocurrencia(inicioIso: string, frecuencia: Frecuencia, n: number): string {
  const c = componentesLocales(inicioIso);

  if (frecuencia === 'semanal') {
    // Suma de días a mano, sin pasar por `Date`. Podría hacerse con
    // milisegundos, y entonces habría que leer el resultado con getUTCMonth,
    // que el lint prohíbe con razón: es exactamente el atajo que produjo
    // BUG-002. Contar días de mes en mes no tiene esa trampa.
    let { anio, mes, dia } = c;
    dia += 7 * n;
    let ultimoDia = diasDelMes(anio, mes);
    while (dia > ultimoDia) {
      dia -= ultimoDia;
      mes += 1;
      if (mes > 12) {
        mes = 1;
        anio += 1;
      }
      ultimoDia = diasDelMes(anio, mes);
    }
    return isoLocal({ ...c, anio, mes, dia });
  }

  const mesesASumar = frecuencia === 'mensual' ? n : n * 12;
  const totalMeses = c.mes - 1 + mesesASumar;
  const anio = c.anio + Math.floor(totalMeses / 12);
  const mes = (totalMeses % 12) + 1;

  return isoLocal({ ...c, anio, mes, dia: Math.min(c.dia, diasDelMes(anio, mes)) });
}

/**
 * Las ocurrencias que ya vencieron y todavía no se han materializado.
 *
 * `generadasHasta` es la última fecha que ya produjo su movimiento; todo lo
 * posterior a ella y anterior o igual a `hasta` está pendiente. Sin ese corte,
 * abrir la app tres veces el mismo día generaría el mismo gasto tres veces.
 *
 * Devuelve varias y no una: si la app estuvo cerrada dos meses, los dos cobros
 * están pendientes y los dos tienen que entrar, cada uno con su fecha real, no
 * los dos con la de hoy.
 */
export function ocurrenciasPendientes(
  inicioIso: string,
  frecuencia: Frecuencia,
  generadasHasta: string | undefined,
  hastaIso: string,
): string[] {
  const pendientes: string[] = [];

  // Tope duro. Un `while` sobre fechas depende de que la aritmética avance
  // siempre; si algún día no lo hiciera, el bucle colgaría la app al abrir en
  // vez de fallar visiblemente. Mil ocurrencias son 19 años de cobros
  // semanales: quien pase de ahí tiene un problema distinto.
  const TOPE = 1000;

  for (let n = 0; n < TOPE; n += 1) {
    const fecha = ocurrencia(inicioIso, frecuencia, n);
    if (comparaInstantes(fecha, hastaIso) > 0) break;
    if (generadasHasta === undefined || comparaInstantes(fecha, generadasHasta) > 0) {
      pendientes.push(fecha);
    }
  }

  return pendientes;
}

/**
 * La próxima fecha de cobro, o null si el recurrente ya no tiene futuro
 * (imposible con estas tres frecuencias, pero el tipo lo dice en vez de
 * mentir con un `!`).
 *
 * No se guarda en la tabla a propósito: derivarla no puede desincronizarse de
 * `inicio`, y una columna sí.
 */
export function proximaOcurrencia(
  inicioIso: string,
  frecuencia: Frecuencia,
  desdeIso: string,
): string | null {
  const TOPE = 1000;
  for (let n = 0; n < TOPE; n += 1) {
    const fecha = ocurrencia(inicioIso, frecuencia, n);
    if (comparaInstantes(fecha, desdeIso) > 0) return fecha;
  }
  return null;
}
