import type { Frecuencia } from './types';

export interface TransaccionHistorica {
  readonly id: string;
  readonly nombre: string;
  readonly amountCents: number;
  readonly fecha: string; // ISO string
  readonly categoryId?: string;
}

export interface PatronRecurrenteDetectado {
  readonly nombreSugerido: string;
  readonly amountCents: number;
  readonly frecuencia: Frecuencia;
  readonly categoryId?: string;
  readonly ocurrenciasCount: number;
  readonly intervaloPromedioDias: number;
  readonly ultimaFecha: string;
}

export function detectarPatronesRecurrentes(
  transacciones: readonly TransaccionHistorica[]
): readonly PatronRecurrenteDetectado[] {
  if (transacciones.length < 2) return [];

  // Agrupar por nombre normalizado y monto exacto en centavos
  const grupos = new Map<string, TransaccionHistorica[]>();

  for (const t of transacciones) {
    const clave = `${t.nombre.trim().toLowerCase()}::${t.amountCents}`;
    const lista = grupos.get(clave);
    if (lista) {
      lista.push(t);
    } else {
      grupos.set(clave, [t]);
    }
  }

  const resultados: PatronRecurrenteDetectado[] = [];

  for (const [, lista] of grupos) {
    if (lista.length < 2) continue;

    // Ordenar cronológicamente ascendente
    const ordenados = [...lista].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    // Calcular diferencias en días
    const intervalosDias: number[] = [];
    for (let i = 1; i < ordenados.length; i++) {
      const prev = new Date(ordenados[i - 1]!.fecha).getTime();
      const curr = new Date(ordenados[i]!.fecha).getTime();
      const difDias = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (difDias > 0) {
        intervalosDias.push(difDias);
      }
    }

    if (intervalosDias.length === 0) continue;

    const promedioDias =
      intervalosDias.reduce((acc, v) => acc + v, 0) / intervalosDias.length;

    let frecuencia: Frecuencia | null = null;
    if (promedioDias >= 6 && promedioDias <= 8) {
      frecuencia = 'semanal';
    } else if (promedioDias >= 27 && promedioDias <= 32) {
      frecuencia = 'mensual';
    } else if (promedioDias >= 350 && promedioDias <= 375) {
      frecuencia = 'anual';
    }

    if (frecuencia) {
      const primero = ordenados[0]!;
      const ultimo = ordenados[ordenados.length - 1]!;
      resultados.push({
        nombreSugerido: primero.nombre.trim(),
        amountCents: primero.amountCents,
        frecuencia,
        categoryId: primero.categoryId,
        ocurrenciasCount: ordenados.length,
        intervaloPromedioDias: Number(promedioDias.toFixed(1)),
        ultimaFecha: ultimo.fecha,
      });
    }
  }

  return resultados;
}
