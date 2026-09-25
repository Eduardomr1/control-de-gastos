/**
 * Materializa los cobros vencidos en gastos e ingresos reales.
 *
 * Corre al abrir la app y no en segundo plano. iOS no garantiza la ejecución
 * periódica en background, así que un job que depende de ella funciona en
 * Android y calla en iOS, que es la peor de las dos opciones: el bug solo
 * aparece en una plataforma. Al abrir la app se ejecuta siempre, en ambas, y
 * `ocurrenciasPendientes` ya sabe recuperar varios periodos de una vez si la
 * app estuvo cerrada dos meses.
 *
 * Vive en un feature y no en `shared/lib/jobs/` como pedía el plan: tiene que
 * crear gastos e ingresos, y `shared/` no puede importar features (Regla 1).
 */

import { nowLocalIso } from '@/shared/lib/date';

import { ocurrenciasPendientes } from '../calendario';
import type { Recurrente } from '../types';
import { fetchRecurrentes, marcarGeneradoHasta } from './recurrentes.local';

/**
 * Evita que dos disparos simultáneos generen lo mismo dos veces. La marca de
 * generación se actualiza después de crear cada movimiento; sin este candado,
 * dos corridas que empiezan a la vez leerían ambas la marca vieja.
 */
let enMarcha = false;

export interface ResultadoGeneracion {
  readonly generados: number;
  readonly revisados: number;
}

export async function generarPendientes(
  ahora: string = nowLocalIso(),
): Promise<ResultadoGeneracion> {
  if (enMarcha) return { generados: 0, revisados: 0 };
  enMarcha = true;

  try {
    const activos = (await fetchRecurrentes()).filter((r) => r.activo);
    let generados = 0;

    for (const recurrente of activos) {
      const pendientes = ocurrenciasPendientes(
        recurrente.inicio,
        recurrente.frecuencia,
        recurrente.generadasHasta,
        ahora,
      );

      for (const fecha of pendientes) {
        await materializar(recurrente, fecha);
        // La marca avanza fecha por fecha y no al final del lote: si la app
        // muere a media generación, lo ya creado queda marcado y no se repite
        // al reabrir.
        //
        // ponytail: crear-y-luego-marcar, sin transacción que abarque las dos
        // tablas. Ambas escrituras son síncronas y consecutivas, así que la
        // ventana es de microsegundos, pero existe: un cierre forzado justo en
        // medio deja un movimiento duplicable. Si algún día importa, las dos
        // escrituras tienen que pasar por un mismo `withTransactionSync` de
        // `shared/lib/db`, lo que obliga a que gastos e ingresos expongan una
        // escritura síncrona.
        marcarGeneradoHasta(recurrente.id, fecha);
        generados += 1;
      }
    }

    return { generados, revisados: activos.length };
  } finally {
    enMarcha = false;
  }
}

async function materializar(recurrente: Recurrente, fecha: string): Promise<void> {
  if (recurrente.tipo === 'ingreso') {
    const { crearIngreso } = await import('@/features/ingresos');
    await crearIngreso({
      amountCents: recurrente.amountCents,
      currency: recurrente.currency,
      fuente: recurrente.fuente ?? recurrente.nombre,
      occurredAt: fecha,
      note: recurrente.nombre,
    });
    return;
  }

  const { crearGasto } = await import('@/features/gastos');
  await crearGasto({
    amountCents: recurrente.amountCents,
    currency: recurrente.currency,
    // 'otros' es la categoría semilla que siempre existe. Un recurrente sin
    // categoría no debe impedir que el cobro se registre.
    categoryId: recurrente.categoryId ?? 'otros',
    occurredAt: fecha,
    note: recurrente.nombre,
  });
}
