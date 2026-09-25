/**
 * Qué recordatorio toca programar y para cuándo.
 *
 * Puro y separado del scheduler a propósito: decidir el aviso es aritmética de
 * calendario que sí se prueba en Node; entregarlo al sistema operativo es un
 * binding nativo que no. Mezclarlos dejaría sin prueba la parte que puede
 * equivocarse.
 */

import { formatDayShort } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';

import { proximaOcurrencia } from './calendario';
import { DIAS_DE_AVISO, type Recurrente } from './types';

export interface Aviso {
  /** El id del recurrente. Reprogramar usa el mismo, nunca uno nuevo. */
  readonly id: string;
  readonly titulo: string;
  readonly cuerpo: string;
  /** Instante en que debe sonar. */
  readonly cuando: Date;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Un aviso por recurrente activo, dos días antes de su próximo cobro.
 *
 * El momento se calcula como INSTANTE (restando milisegundos) y no como fecha
 * de calendario: un recordatorio dos días antes no cambia de sentido porque
 * entre medias haya un cambio de horario de verano, y `Date` es justo lo que
 * el sistema operativo espera recibir.
 *
 * Los que ya pasaron su momento de aviso se omiten: programar una notificación
 * para el pasado, según la plataforma, la dispara de inmediato o la descarta
 * en silencio. Ninguna de las dos es lo que el usuario pidió.
 */
export function avisosDeRecurrentes(
  recurrentes: readonly Recurrente[],
  ahoraIso: string,
): Aviso[] {
  const ahora = Date.parse(ahoraIso);

  return recurrentes.flatMap((r) => {
    if (!r.activo || r.deletedAt) return [];

    const proxima = proximaOcurrencia(r.inicio, r.frecuencia, ahoraIso);
    if (proxima === null) return [];

    const cuando = new Date(Date.parse(proxima) - DIAS_DE_AVISO * MS_POR_DIA);
    if (cuando.getTime() <= ahora) return [];

    return [
      {
        id: r.id,
        titulo: `${r.nombre} se cobra pronto`,
        cuerpo: `${formatMoney(r.amountCents, r.currency)} el ${formatDayShort(proxima)}.`,
        cuando,
      },
    ];
  });
}
