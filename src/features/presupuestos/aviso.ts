/**
 * Decide si un gasto recién registrado merece un aviso, y con qué texto.
 *
 * Recibe los gastos en vez de pedirlos: presupuestos no puede leer la tabla de
 * gastos —es otro feature— y tampoco debería. Quien registra el gasto ya los
 * tiene en la mano.
 *
 * Devuelve el aviso; no lo muestra. Quién lo presenta (un Alert, una franja,
 * una notificación del sistema) es decisión de la pantalla, y así esta función
 * se prueba entera en Node.
 */

import { monthKeyOf } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import type { Expense } from '@/types/expense';

import { fetchPresupuestos } from './api/presupuestos.local';
import { gastoPorCategoria, presupuestoVigente, umbralCruzado } from './progreso';

export interface AvisoDePresupuesto {
  readonly umbral: number;
  readonly gastadoCents: number;
  readonly limiteCents: number;
  readonly titulo: string;
  readonly cuerpo: string;
}

export async function avisoDeUmbral(
  gastoNuevo: Expense,
  gastosDelMes: readonly Expense[],
  nombreCategoria: string,
): Promise<AvisoDePresupuesto | null> {
  const mes = monthKeyOf(gastoNuevo.occurredAt);
  const vigente = presupuestoVigente(
    await fetchPresupuestos(),
    gastoNuevo.categoryId,
    mes,
  );
  if (!vigente) return null;

  // El gasto puede o no venir ya en la lista, según si quien llama refrescó
  // antes o después de guardar. Incluirlo aquí hace la función independiente
  // de ese orden, en vez de depender de que el llamador acierte.
  const conElNuevo = gastosDelMes.some((g) => g.id === gastoNuevo.id)
    ? gastosDelMes
    : [...gastosDelMes, gastoNuevo];

  const gastado = gastoPorCategoria(conElNuevo, mes).get(gastoNuevo.categoryId) ?? 0;
  const umbral = umbralCruzado(
    gastado - gastoNuevo.amountCents,
    gastado,
    vigente.limiteCents,
  );
  if (umbral === null) return null;

  const cuerpo = `Llevas ${formatMoney(gastado)} de ${formatMoney(vigente.limiteCents)} este mes.`;

  return {
    umbral,
    gastadoCents: gastado,
    limiteCents: vigente.limiteCents,
    titulo:
      umbral >= 1
        ? `Te pasaste del presupuesto de ${nombreCategoria}`
        : `Vas al 80% de ${nombreCategoria}`,
    cuerpo,
  };
}
