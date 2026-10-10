import { sumCents } from '@/shared/lib/money';
import type { MonthKey } from '@/shared/lib/date';
import type { BarraDeMes, TajadaDeCategoria } from './agregados';

export interface DetalleCategoriaSeleccionada {
  readonly activa: TajadaDeCategoria | null;
  readonly montoCents: number;
  readonly porcentaje: number;
  readonly esFiltroActivo: boolean;
  readonly etiqueta: string;
}

/**
 * Calcula las métricas presentadas en el centro del anillo interactivo
 * cuando el usuario inspecciona una categoría o el total del mes.
 */
export function calcularDetalleSeleccion(
  tajadas: readonly TajadaDeCategoria[],
  seleccionadaId: string | null,
): DetalleCategoriaSeleccionada {
  const totalGeneral = sumCents(tajadas.map((t) => t.totalCents));

  if (!seleccionadaId) {
    return {
      activa: null,
      montoCents: totalGeneral,
      porcentaje: 100,
      esFiltroActivo: false,
      etiqueta: 'Total',
    };
  }

  const encontrada = tajadas.find((t) => t.categoryId === seleccionadaId);
  if (!encontrada) {
    return {
      activa: null,
      montoCents: totalGeneral,
      porcentaje: 100,
      esFiltroActivo: false,
      etiqueta: 'Total',
    };
  }

  return {
    activa: encontrada,
    montoCents: encontrada.totalCents,
    porcentaje: encontrada.porcentaje,
    esFiltroActivo: true,
    etiqueta: encontrada.nombre,
  };
}

export interface MetricaBarraMes {
  readonly mes: MonthKey;
  readonly totalCents: number;
  readonly porcentajeRelativo: number;
  readonly esActivo: boolean;
}

/**
 * Normaliza las barras de comparación de meses respecto al mes de mayor gasto,
 * evitando divisiones entre cero y calculando el estado activo del selector.
 */
export function calcularMetricasBarras(
  barras: readonly BarraDeMes[],
  seleccionado?: MonthKey,
): readonly MetricaBarraMes[] {
  const maximo = Math.max(...barras.map((b) => b.totalCents), 1);

  return barras.map((b) => {
    const rawPct = (b.totalCents / maximo) * 100;
    const porcentajeRelativo = Math.min(100, Math.max(0, Number(rawPct.toFixed(2))));

    return {
      mes: b.mes,
      totalCents: b.totalCents,
      porcentajeRelativo,
      esActivo: b.mes === seleccionado,
    };
  });
}
